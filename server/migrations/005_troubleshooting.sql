-- Additive: shared, explicitly invited troubleshooting sessions. No machine commands.
create table if not exists public.iag_troubleshooting (
 id uuid primary key, facility_id text not null check(facility_id='facility-j-lieb'), asset_id text not null,
 created_by uuid not null references auth.users(id), version bigint not null, payload jsonb not null,
 updated_at timestamptz not null default now()
);
create table if not exists public.iag_troubleshooting_members (
 session_id uuid not null references public.iag_troubleshooting(id), user_id uuid not null references auth.users(id),
 invited_at timestamptz not null default now(), accepted_at timestamptz, primary key(session_id,user_id)
);
create table if not exists public.iag_troubleshooting_events (
 session_id uuid not null references public.iag_troubleshooting(id), version bigint not null,
 actor uuid not null references auth.users(id), at timestamptz not null default now(), action text not null,
 payload jsonb not null, request_payload jsonb not null, request_id uuid not null unique, primary key(session_id,version)
);
create or replace function public.iag_troubleshooting_access(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (exists(select 1 from public.iag_troubleshooting_members where session_id=p_id and user_id=auth.uid())
 or exists(select 1 from auth.users where id=auth.uid() and raw_app_meta_data->>'iag_role'='admin'));
$$;
alter table public.iag_troubleshooting enable row level security;
alter table public.iag_troubleshooting_members enable row level security;
alter table public.iag_troubleshooting_events enable row level security;
create policy "Troubleshooting participants" on public.iag_troubleshooting for select to authenticated using(public.iag_troubleshooting_access(id));
create policy "Troubleshooting participant list" on public.iag_troubleshooting_members for select to authenticated using(public.iag_troubleshooting_access(session_id));
create policy "Troubleshooting audit readers" on public.iag_troubleshooting_events for select to authenticated using(public.iag_troubleshooting_access(session_id));
grant select on public.iag_troubleshooting,public.iag_troubleshooting_members,public.iag_troubleshooting_events to authenticated;
revoke insert,update,delete on public.iag_troubleshooting,public.iag_troubleshooting_members,public.iag_troubleshooting_events from anon,authenticated;

create or replace function public.iag_troubleshooting_save(p_id uuid,p_facility text,p_asset text,p_base bigint,p_action text,p_payload jsonb,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.iag_troubleshooting; prior public.iag_troubleshooting_events; v bigint; item record; clean jsonb:=p_payload; actor_name text; is_admin boolean;
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and confirmed_at is not null) then raise exception 'Confirmed sign-in required.' using errcode='42501';end if;
 if p_facility is distinct from 'facility-j-lieb' or p_asset is null or p_asset='' or p_action not in ('create','answer','assessment','outcome','accept','state-change','handoff','notes') or p_action is null or p_base is null or p_request is null then raise exception 'Invalid session request.';end if;
 if p_payload is null or octet_length(p_payload::text)>200000 or p_payload->>'revision' is distinct from 'climax-2026-09-15-draft-1'
 or coalesce(p_payload->>'symptom','') not in ('nothing','bottle','case','pickup','transfer','axis','home','halfway','intermittent','restart')
 or coalesce(p_payload->>'outcome','') not in ('unresolved','escalated','restored')
 or coalesce(p_payload->>'recoveryKind','') not in ('reset','home','jog','isolation','power') then raise exception 'Invalid troubleshooting payload.';end if;
 foreach actor_name in array array['intake','answers','recovery','restart'] loop
  if jsonb_typeof(p_payload->actor_name) is distinct from 'object' then raise exception 'Missing session fields.';end if;
 end loop;
 foreach actor_name in array array['nextAction','responsible','isolation','actions','workId'] loop
  if jsonb_typeof(p_payload->actor_name) is distinct from 'string' then raise exception 'Invalid session text.';end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into w from public.iag_troubleshooting where id=p_id;
 is_admin:=exists(select 1 from auth.users where id=auth.uid() and raw_app_meta_data->>'iag_role'='admin');
 if w.id is not null and (w.facility_id<>p_facility or w.asset_id<>p_asset or not public.iag_troubleshooting_access(p_id)) then raise exception 'Session access denied.' using errcode='42501';end if;
 if w.id is not null and p_action<>'accept' and not is_admin and not exists(select 1 from public.iag_troubleshooting_members where session_id=p_id and user_id=auth.uid() and accepted_at is not null) then raise exception 'Accept the handoff before editing.' using errcode='42501';end if;
 select * into prior from public.iag_troubleshooting_events where request_id=p_request;
 if found then
  if prior.session_id<>p_id or prior.actor<>auth.uid() or prior.request_payload<>p_payload or prior.action<>p_action then raise exception 'Request identifier collision.';end if;
  return to_jsonb(w);
 end if;
 if coalesce(w.version,0)<>p_base then return jsonb_build_object('status','conflict','version',w.version);end if;
 if w.id is null then
  if p_action<>'create' or p_base<>0 or p_payload->>'outcome'<>'unresolved' or p_payload->'answers'<>'{}'::jsonb then raise exception 'Start an unresolved session.';end if;
  if p_asset<>'LIEB-L2-CLIMAX-6759' and not exists(select 1 from public.iag_publications pub cross join lateral jsonb_array_elements(pub.payload#>'{plant,assets}') a where pub.facility_id=p_facility and a->>'id'=p_asset and a->>'name' ilike '%climax%') then raise exception 'Documented Climax asset required.';end if;
 else
  if p_action='create' or p_payload->>'revision' is distinct from w.payload->>'revision' or p_payload->>'symptom' is distinct from w.payload->>'symptom' then raise exception 'Session revision and symptom are immutable.';end if;
 end if;
 clean:=jsonb_set(clean,'{epoch}',coalesce(w.payload->'epoch','0'::jsonb));
 if p_action='answer' and exists(select 1 from jsonb_each(clean->'answers') a where w.payload->'answers' ? a.key and (a.value->>'answer' is distinct from w.payload->'answers'->a.key->>'answer' or a.value->>'note' is distinct from w.payload->'answers'->a.key->>'note')) then
  clean:=jsonb_set(clean,'{epoch}',to_jsonb(coalesce((w.payload->>'epoch')::int,0)+1));
 end if;
 if p_action in ('accept','state-change') then
  clean:=jsonb_set(clean,'{epoch}',to_jsonb(coalesce((w.payload->>'epoch')::int,0)+1));
  clean:=jsonb_set(clean,'{restart}','{}'); clean:=jsonb_set(clean,'{outcome}','"unresolved"');
 elsif p_action<>'outcome' then clean:=jsonb_set(clean,'{restart}','{}');clean:=jsonb_set(clean,'{outcome}','"unresolved"');
 end if;
 for item in select * from jsonb_each(clean->'answers') loop
  if item.key not in ('safety','master','air','mode','bottle','case','grip','drive','reference','interruption','intermittent') or coalesce(item.value->>'answer','') not in ('yes','no','unknown') or jsonb_typeof(item.value->'note') is distinct from 'string' then raise exception 'Invalid observation.';end if;
  if item.value is distinct from w.payload->'answers'->item.key then
   if p_action<>'answer' then raise exception 'Record changes as observations.';end if;
   clean:=jsonb_set(clean,array['answers',item.key],item.value||jsonb_build_object('author',auth.uid(),'at',now(),'epoch',clean->'epoch'));
  end if;
 end loop;
 if w.id is not null and exists(select 1 from jsonb_object_keys(w.payload->'answers') k where not (clean->'answers' ? k)) then raise exception 'Prior answers must be retained.';end if;
 if clean->>'outcome'='restored' then
  if p_action<>'outcome' then raise exception 'Explicit outcome verification required.';end if;
  foreach actor_name in array array['personnel','load','reference','mode','fault','sequence','operation'] loop
   if clean->'restart'->>actor_name is distinct from 'yes' then raise exception 'Complete every restart verification before recording restored operation.';end if;
  end loop;
 end if;
 v:=coalesce(w.version,0)+1;
 insert into public.iag_troubleshooting values(p_id,p_facility,p_asset,auth.uid(),v,clean,now())
 on conflict(id) do update set version=v,payload=clean,updated_at=now() returning * into w;
 if p_action='create' then insert into public.iag_troubleshooting_members(session_id,user_id,accepted_at) values(p_id,auth.uid(),now());end if;
 if p_action='accept' then update public.iag_troubleshooting_members set accepted_at=now() where session_id=p_id and user_id=auth.uid();end if;
 insert into public.iag_troubleshooting_events(session_id,version,actor,action,payload,request_payload,request_id) values(p_id,v,auth.uid(),p_action,clean,p_payload,p_request);
 return to_jsonb(w);
end;$$;

create or replace function public.iag_troubleshooting_invite(p_id uuid,p_email text) returns void
language plpgsql security definer set search_path='' as $$
declare target uuid; w public.iag_troubleshooting;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into w from public.iag_troubleshooting where id=p_id;
 if w.id is null or auth.uid() is null or (w.created_by<>auth.uid() and not exists(select 1 from auth.users where id=auth.uid() and raw_app_meta_data->>'iag_role'='admin')) then raise exception 'Only the session owner or administrator may invite relief.' using errcode='42501';end if;
 select id into target from auth.users where lower(email)=lower(trim(p_email)) and confirmed_at is not null;
 if target is null then raise exception 'A confirmed account with that email is required.';end if;
 insert into public.iag_troubleshooting_members(session_id,user_id) values(p_id,target) on conflict do nothing;
end;$$;
revoke all on function public.iag_troubleshooting_access(uuid),public.iag_troubleshooting_save(uuid,text,text,bigint,text,jsonb,uuid),public.iag_troubleshooting_invite(uuid,text) from public;
grant execute on function public.iag_troubleshooting_access(uuid),public.iag_troubleshooting_save(uuid,text,text,bigint,text,jsonb,uuid),public.iag_troubleshooting_invite(uuid,text) to authenticated;
