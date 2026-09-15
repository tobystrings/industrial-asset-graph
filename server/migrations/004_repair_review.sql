-- Additive migration: existing publication, proposal, evidence and revision stores are retained.
create table if not exists public.iag_work (
 id uuid primary key, facility_id text not null check(facility_id='facility-j-lieb'),
 author_id uuid not null, version bigint not null, payload jsonb not null,
 updated_at timestamptz not null default now()
);
create table if not exists public.iag_work_revisions (
 id uuid not null, version bigint not null, author_id uuid not null, request_id uuid not null unique,
 payload jsonb not null, created_at timestamptz not null default now(), primary key(id,version)
);
create table if not exists public.iag_reviews (
 id uuid primary key default gen_random_uuid(), work_id uuid not null, work_version bigint not null,
 facility_id text not null check(facility_id='facility-j-lieb'), author_id uuid not null,
 original jsonb not null, proposal jsonb, state text not null default 'received'
 check(state in ('received','clarification','approved','applied','rejected')),
 version bigint not null default 1, created_at timestamptz not null default now(),
 approved_by uuid, approved_at timestamptz, applied_by uuid, applied_at timestamptz,
 application_revision bigint, events jsonb not null default '[]', unique(work_id,work_version)
);
create table if not exists public.iag_app_requests (
 id uuid primary key, facility_id text not null, source_id uuid not null references public.iag_reviews(id),
 title text not null, state text not null default 'approved'
 check(state in ('approved','planned','in progress','in review','released','declined')),
 reference text not null default '', updated_at timestamptz not null default now(), updated_by uuid not null
);
alter table public.iag_work enable row level security;
alter table public.iag_work_revisions enable row level security;
alter table public.iag_reviews enable row level security;
alter table public.iag_app_requests enable row level security;
create policy "Own work or administrator" on public.iag_work for select to authenticated using(author_id=auth.uid() or auth.jwt()->'app_metadata'->>'iag_role'='admin');
create policy "Own work history or administrator" on public.iag_work_revisions for select to authenticated using(author_id=auth.uid() or auth.jwt()->'app_metadata'->>'iag_role'='admin');
create policy "Own receipt or administrator" on public.iag_reviews for select to authenticated using(author_id=auth.uid() or auth.jwt()->'app_metadata'->>'iag_role'='admin');
create policy "Administrator request queue" on public.iag_app_requests for select to authenticated using(auth.jwt()->'app_metadata'->>'iag_role'='admin');
grant select on public.iag_work,public.iag_work_revisions,public.iag_reviews,public.iag_app_requests to authenticated;
revoke insert,update,delete on public.iag_work,public.iag_work_revisions,public.iag_reviews,public.iag_app_requests from anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit) values('iag-work','iag-work',false,52428800) on conflict(id) do nothing;
create policy "Work originals are immutable" on storage.objects for insert to authenticated with check(bucket_id='iag-work' and (storage.foldername(name))[1]='facility-j-lieb' and (storage.foldername(name))[2]=auth.uid()::text);
create policy "Own work originals or administrator" on storage.objects for select to authenticated using(bucket_id='iag-work' and ((storage.foldername(name))[2]=auth.uid()::text or auth.jwt()->'app_metadata'->>'iag_role'='admin'));

create or replace function public.iag_work_save(p_id uuid,p_facility text,p_base bigint,p_request uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_row public.iag_work; prior public.iag_work_revisions; next_version bigint; f jsonb;
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and confirmed_at is not null) then raise exception 'Sign in required.' using errcode='42501';end if;
 if p_facility<>'facility-j-lieb' or p_payload->>'facilityId' is distinct from p_facility or p_payload->>'authorId' is distinct from auth.uid()::text or p_payload->>'id' is distinct from p_id::text or jsonb_typeof(p_payload->'entries') is distinct from 'array' or jsonb_typeof(p_payload->'files') is distinct from 'array' or jsonb_typeof(p_payload->'summary') is distinct from 'object' or jsonb_typeof(p_payload->'note') is distinct from 'string' or coalesce(p_payload->>'kind','') not in ('repair','note','question','correction','app-change') or octet_length(p_payload::text)>1000000 then raise exception 'Invalid work record.';end if;
 for f in select value from jsonb_array_elements(p_payload->'files') loop
  if f->>'path' not like p_facility||'/'||auth.uid()::text||'/'||p_id::text||'/%' or not exists(select 1 from storage.objects where bucket_id='iag-work' and name=f->>'path') then raise exception 'Original attachment has not been received.';end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into current_row from public.iag_work where id=p_id;
 if found and (current_row.author_id<>auth.uid() or current_row.facility_id<>p_facility) then raise exception 'This work belongs to another user or facility.' using errcode='42501';end if;
 select * into prior from public.iag_work_revisions where request_id=p_request;
 if found then
  if prior.id<>p_id or prior.author_id<>auth.uid() or prior.payload<>p_payload then raise exception 'Request identifier collision.';end if;
  return jsonb_build_object('status','duplicate','version',prior.version);
 end if;
 if coalesce(current_row.version,0)<>p_base then return jsonb_build_object('status','conflict','version',current_row.version);end if;
 next_version:=coalesce(current_row.version,0)+1;
 insert into public.iag_work_revisions(id,version,author_id,request_id,payload) values(p_id,next_version,auth.uid(),p_request,p_payload);
 insert into public.iag_work values(p_id,p_facility,auth.uid(),next_version,p_payload,now()) on conflict(id) do update set version=excluded.version,payload=excluded.payload,updated_at=excluded.updated_at;
 return jsonb_build_object('status','saved','version',next_version);
end;$$;

create or replace function public.iag_work_submit(p_id uuid,p_version bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.iag_work; r public.iag_reviews;
begin
 select * into w from public.iag_work where id=p_id for update;
 if not found or w.author_id is distinct from auth.uid() then raise exception 'Your received work is required.' using errcode='42501';end if;
 select * into r from public.iag_reviews where work_id=p_id and work_version=p_version;
 if found then return to_jsonb(r);end if;
 if w.version<>p_version then raise exception 'Work changed; synchronize before submitting.';end if;
 insert into public.iag_reviews(work_id,work_version,facility_id,author_id,original,events)
 values(p_id,p_version,w.facility_id,auth.uid(),w.payload,jsonb_build_array(jsonb_build_object('at',now(),'actor',auth.uid(),'action','received','text','Original submission received.'))) returning * into r;
 return to_jsonb(r);
end;$$;

create or replace function public.iag_review_action(p_id uuid,p_version bigint,p_action text,p_proposal jsonb,p_text text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.iag_reviews; is_admin boolean; pub public.iag_publications; payload jsonb; target jsonb; updated jsonb;
 destination text; target_id text; proposal_text text; items jsonb; source_id text; result jsonb; service jsonb;
begin
 is_admin:=exists(select 1 from auth.users where id=auth.uid() and raw_app_meta_data->>'iag_role'='admin');
 select * into r from public.iag_reviews where id=p_id for update;
 if not found or auth.uid() is null or (not is_admin and (p_action<>'reply' or r.author_id<>auth.uid())) then raise exception 'Administrator review permission required.' using errcode='42501';end if;
 if p_action='apply' and r.state='applied' then return to_jsonb(r);end if;
 if r.version<>p_version then raise exception 'Submission changed during review. Reload and compare.';end if;
 if r.state in ('applied','rejected') then raise exception 'This review is closed; submit a new correction.';end if;
 if p_action='propose' then
  if coalesce(p_proposal->>'destination','') not in ('repair','asset','inventory','document','app-change') or length(trim(coalesce(p_proposal->>'text','')))=0 then raise exception 'Choose a destination and write the proposed change.';end if;
  r.proposal:=p_proposal;r.state:='received';r.approved_by:=null;r.approved_at:=null;
 elsif p_action in ('clarify','reply') then
  if length(trim(coalesce(p_text,'')))=0 then raise exception 'Write a question or reply.';end if;
  r.state:=case when p_action='clarify' then 'clarification' else 'received' end;r.approved_by:=null;r.approved_at:=null;
 elsif p_action='approve' then
  if r.proposal is null then raise exception 'Save a proposal before approval.';end if;
  r.state:='approved';r.approved_by:=auth.uid();r.approved_at:=now();
 elsif p_action='reject' then r.state:='rejected';
 elsif p_action='apply' then
  if r.state<>'approved' or r.proposal is null then raise exception 'Approve this proposal revision first.';end if;
  destination:=r.proposal->>'destination';target_id:=r.proposal->>'targetId';proposal_text:=r.proposal->>'text';
  if destination='app-change' then
   insert into public.iag_app_requests(id,facility_id,source_id,title,updated_by) values(r.id,r.facility_id,r.id,proposal_text,auth.uid());
  else
   perform pg_advisory_xact_lock(hashtextextended(r.facility_id,0));
   select * into pub from public.iag_publications where facility_id=r.facility_id for update;
   if not found then raise exception 'No shared plant publication exists yet.';end if;
   payload:=pub.payload;
   items:=case when destination in ('asset','repair') then payload#>'{plant,assets}' when destination='inventory' then payload#>'{plant,facility,inventory,parts}' else payload#>'{plant,documents}' end;
   select value into target from jsonb_array_elements(coalesce(items,'[]')) where value->>'id'=target_id;
   if target is null then raise exception 'Destination record is missing.';end if;
   if target is distinct from r.proposal->'base' then raise exception 'Destination changed during review. Compare the current record and save a revised proposal.';end if;
   updated:=target;
   source_id:='review-source-'||r.id::text;
   if destination='asset' then updated:=jsonb_set(target,'{description}',to_jsonb(proposal_text));
   elsif destination='inventory' then updated:=jsonb_set(target,'{notes}',to_jsonb(proposal_text));
   elsif destination='document' then updated:=jsonb_set(target,'{title}',to_jsonb(proposal_text));
   elsif destination='repair' then
    if target->'production' is null then updated:=jsonb_set(updated,'{production}','{"memberships":[],"stage":"","electrical":{},"redundancy":"UNKNOWN","spares":"UNKNOWN","safetySignificance":"","service":[]}');end if;
    service:=jsonb_build_object('id','repair-'||r.id::text,'date',r.original->>'updatedAt','symptom',coalesce(r.proposal#>>'{summary,problem}',proposal_text),'observation',coalesce(r.proposal#>>'{summary,findings}',''),'action',coalesce(r.proposal#>>'{summary,work}',''),'spareParts',(select coalesce(string_agg(value->>'text',E'\n'),'') from jsonb_array_elements(r.original->'entries') where value->>'kind'='parts'),'task',concat_ws(E'\n',r.proposal#>>'{summary,outcome}',r.proposal#>>'{summary,remaining}'),'evidenceIds',jsonb_build_array(source_id));
    updated:=jsonb_set(updated,'{production,service}',coalesce(updated#>'{production,service}','[]')||jsonb_build_array(service));
   end if;
   select jsonb_agg(case when value->>'id'=target_id then updated else value end) into items from jsonb_array_elements(items);
   if destination in ('asset','repair') then payload:=jsonb_set(payload,'{plant,assets}',items);
   elsif destination='inventory' then payload:=jsonb_set(payload,'{plant,facility,inventory,parts}',items);
   else payload:=jsonb_set(payload,'{plant,documents}',items);end if;
   payload:=jsonb_set(payload,'{plant,evidence}',(payload#>'{plant,evidence}')||jsonb_build_array(jsonb_build_object('id',source_id,'type','CMMS_RECORD','title','Reviewed submission '||r.id::text,'pathOrUrl','/industrial-asset-graph/?page=submission&submission='||r.id::text,'access','RESTRICTED')));
   payload:=jsonb_set(payload,'{plant,packageRevision}',to_jsonb(coalesce((payload#>>'{plant,packageRevision}')::bigint,0)+1));
   payload:=jsonb_set(payload,array['plant','entityVersions',target_id],to_jsonb(coalesce((payload#>>array['plant','entityVersions',target_id])::bigint,0)+1));
   payload:=jsonb_set(payload,'{audit}',coalesce(payload->'audit','[]')||jsonb_build_array(jsonb_build_object('id','review-applied-'||r.id::text,'actor',auth.uid(),'at',now(),'action','Applied approved submission','detail',target_id||' · '||r.id::text)));
   result:=public.iag_publish(r.facility_id,pub.revision,r.id,payload);
   if result->>'status' not in ('saved','duplicate') then raise exception 'Shared publication changed; application was not committed.';end if;
   r.application_revision:=(result->>'revision')::bigint;
  end if;
  r.state:='applied';r.applied_by:=auth.uid();r.applied_at:=now();
 else raise exception 'Unknown review action.';end if;
 r.version:=r.version+1;r.events:=r.events||jsonb_build_array(jsonb_build_object('at',now(),'actor',auth.uid(),'action',p_action,'text',coalesce(p_text,''),'proposal',case when p_action='propose' then p_proposal else null end));
 update public.iag_reviews set proposal=r.proposal,state=r.state,version=r.version,approved_by=r.approved_by,approved_at=r.approved_at,applied_by=r.applied_by,applied_at=r.applied_at,application_revision=r.application_revision,events=r.events where id=r.id;
 return to_jsonb(r);
end;$$;

create or replace function public.iag_request_update(p_id uuid,p_state text,p_reference text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.users where id=auth.uid() and raw_app_meta_data->>'iag_role'='admin') then raise exception 'Administrator permission required.' using errcode='42501';end if;
 if p_state not in ('approved','planned','in progress','in review','released','declined') then raise exception 'Invalid request state.';end if;
 update public.iag_app_requests set state=p_state,reference=p_reference,updated_at=now(),updated_by=auth.uid() where id=p_id;
end;$$;
revoke all on function public.iag_work_save(uuid,text,bigint,uuid,jsonb),public.iag_work_submit(uuid,bigint),public.iag_review_action(uuid,bigint,text,jsonb,text),public.iag_request_update(uuid,text,text) from public;
grant execute on function public.iag_work_save(uuid,text,bigint,uuid,jsonb),public.iag_work_submit(uuid,bigint),public.iag_review_action(uuid,bigint,text,jsonb,text),public.iag_request_update(uuid,text,text) to authenticated;
