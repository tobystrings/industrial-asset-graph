-- Owner authorization, 2026-09-09: publish J. Lieb plant content on GitHub.
-- Authentication credentials are never part of a publication.
create table if not exists public.iag_publications (
  facility_id text primary key check (facility_id = 'facility-j-lieb'),
  revision bigint not null default 0,
  payload jsonb not null,
  request_id uuid not null,
  updated_at timestamptz not null default now(),
  updated_by uuid not null
);
create table if not exists public.iag_publication_revisions (
  facility_id text not null,
  revision bigint not null,
  payload jsonb not null,
  request_id uuid not null unique,
  updated_at timestamptz not null default now(),
  updated_by uuid not null,
  primary key (facility_id, revision)
);
alter table public.iag_publications enable row level security;
alter table public.iag_publication_revisions enable row level security;
create policy "Public plant publications" on public.iag_publications for select to anon, authenticated using (true);
create policy "Public plant revision history" on public.iag_publication_revisions for select to anon, authenticated using (true);
grant select on public.iag_publications, public.iag_publication_revisions to anon, authenticated;
revoke insert, update, delete on public.iag_publications, public.iag_publication_revisions from anon, authenticated;

create or replace function public.iag_publish(p_facility_id text, p_base_revision bigint, p_request_id uuid, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_row public.iag_publications; prior public.iag_publication_revisions; next_revision bigint;
begin
  if auth.uid() is null or not exists (select 1 from auth.users where id = auth.uid() and raw_app_meta_data->>'iag_role' = 'admin') then
    raise exception 'Administrator sign-in is required to publish canonical plant data.' using errcode = '42501';
  end if;
  if p_facility_id <> 'facility-j-lieb' or p_payload->>'facilityId' is distinct from p_facility_id
     or p_payload->>'format' is distinct from 'iag-publication' or p_payload->>'version' is distinct from '1'
     or p_payload#>>'{plant,facility,id}' is distinct from p_facility_id
     or jsonb_typeof(p_payload->'attachments') is distinct from 'array'
     or jsonb_typeof(p_payload->'history') is distinct from 'array' then
    raise exception 'Publication format or facility mismatch.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_facility_id, 0));
  select * into prior from public.iag_publication_revisions where request_id = p_request_id;
  if found then
    if prior.facility_id <> p_facility_id or prior.payload <> p_payload then raise exception 'Request ID already used for different content.'; end if;
    return jsonb_build_object('status','duplicate','revision',prior.revision);
  end if;
  select * into current_row from public.iag_publications where facility_id = p_facility_id;
  if coalesce(current_row.revision,0) <> p_base_revision then
    return jsonb_build_object('status','conflict','revision',current_row.revision,'payload',current_row.payload);
  end if;
  next_revision := coalesce(current_row.revision,0) + 1;
  insert into public.iag_publication_revisions values (p_facility_id,next_revision,p_payload,p_request_id,now(),auth.uid());
  insert into public.iag_publications values (p_facility_id,next_revision,p_payload,p_request_id,now(),auth.uid())
    on conflict (facility_id) do update set revision=excluded.revision,payload=excluded.payload,request_id=excluded.request_id,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
  return jsonb_build_object('status','saved','revision',next_revision);
end;
$$;
revoke all on function public.iag_publish(text,bigint,uuid,jsonb) from public;
grant execute on function public.iag_publish(text,bigint,uuid,jsonb) to authenticated;

insert into storage.buckets (id,name,public,file_size_limit) values ('iag-public','iag-public',true,52428800) on conflict(id) do nothing;
create policy "Read published plant files" on storage.objects for select to anon,authenticated using (bucket_id='iag-public');
create policy "Administrator adds immutable plant files" on storage.objects for insert to authenticated
  with check (bucket_id='iag-public' and (storage.foldername(name))[1]='facility-j-lieb'
    and (auth.jwt()->'app_metadata'->>'iag_role')='admin');
-- No browser overwrite/delete policy: old source bytes and revisions remain recoverable.
