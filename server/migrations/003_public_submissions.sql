-- Technician work is publicly saved as a proposal; it never replaces canonical plant data.
create table public.iag_submissions (
  facility_id text not null check(facility_id='facility-j-lieb'), submitted_by uuid not null,
  revision bigint not null, payload jsonb not null, request_id uuid not null,
  updated_at timestamptz not null default now(), primary key(facility_id,submitted_by)
);
create table public.iag_submission_revisions (
  facility_id text not null, submitted_by uuid not null, revision bigint not null,
  payload jsonb not null, request_id uuid not null unique, updated_at timestamptz not null default now(),
  primary key(facility_id,submitted_by,revision)
);
alter table public.iag_submissions enable row level security;
alter table public.iag_submission_revisions enable row level security;
create policy "Public proposed work" on public.iag_submissions for select to anon,authenticated using(true);
create policy "Public proposal history" on public.iag_submission_revisions for select to anon,authenticated using(true);
grant select on public.iag_submissions,public.iag_submission_revisions to anon,authenticated;
revoke insert,update,delete on public.iag_submissions,public.iag_submission_revisions from anon,authenticated;
create or replace function public.iag_submit(p_facility_id text,p_base_revision bigint,p_request_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_row public.iag_submissions; prior public.iag_submission_revisions; next_revision bigint;
begin
  if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and confirmed_at is not null) then raise exception 'Sign-in required.' using errcode='42501'; end if;
  if p_facility_id<>'facility-j-lieb' or p_payload->>'facilityId' is distinct from p_facility_id or p_payload#>>'{plant,facility,id}' is distinct from p_facility_id or p_payload->>'format' is distinct from 'iag-publication' then raise exception 'Proposal facility mismatch.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_facility_id||auth.uid()::text,0));
  select * into prior from public.iag_submission_revisions where request_id=p_request_id;
  if found then
    if prior.submitted_by<>auth.uid() or prior.payload<>p_payload then raise exception 'Request ID collision.';end if;
    return jsonb_build_object('status','duplicate','revision',prior.revision);
  end if;
  select * into current_row from public.iag_submissions where facility_id=p_facility_id and submitted_by=auth.uid();
  if coalesce(current_row.revision,0)<>p_base_revision then return jsonb_build_object('status','conflict','revision',current_row.revision);end if;
  next_revision:=coalesce(current_row.revision,0)+1;
  insert into public.iag_submission_revisions values(p_facility_id,auth.uid(),next_revision,p_payload,p_request_id,now());
  insert into public.iag_submissions values(p_facility_id,auth.uid(),next_revision,p_payload,p_request_id,now()) on conflict(facility_id,submitted_by) do update set revision=excluded.revision,payload=excluded.payload,request_id=excluded.request_id,updated_at=excluded.updated_at;
  return jsonb_build_object('status','saved','revision',next_revision);
end;$$;
revoke all on function public.iag_submit(text,bigint,uuid,jsonb) from public;
grant execute on function public.iag_submit(text,bigint,uuid,jsonb) to authenticated;
create policy "Signed-in plant evidence uploads" on storage.objects for insert to authenticated
with check(bucket_id='iag-public' and (storage.foldername(name))[1]='facility-j-lieb' and (storage.foldername(name))[2]=auth.uid()::text);
