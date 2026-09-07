-- Username aliases are private. Passwords remain exclusively in Supabase Auth.
create schema if not exists iag_private;
revoke all on schema iag_private from public, anon, authenticated;
create table if not exists iag_private.usernames (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9][a-z0-9_.-]{2,31}$')
);
alter table iag_private.usernames enable row level security;
create table if not exists iag_private.login_limits (
  bucket text primary key,
  window_start timestamptz not null,
  attempts integer not null
);
alter table iag_private.login_limits enable row level security;

create or replace function public.get_my_username() returns text
language sql security definer set search_path = '' as $$
  select username from iag_private.usernames where user_id = auth.uid();
$$;
revoke all on function public.get_my_username() from public, anon;
grant execute on function public.get_my_username() to authenticated;

create or replace function public.set_my_username(new_username text) returns void
language plpgsql security definer set search_path = '' as $$
declare normalized text := lower(trim(new_username));
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if normalized is null or normalized !~ '^[a-z0-9][a-z0-9_.-]{2,31}$' then raise exception 'Invalid username'; end if;
  insert into iag_private.usernames(user_id, username) values(auth.uid(), normalized)
  on conflict (user_id) do update set username = excluded.username;
end;
$$;
revoke all on function public.set_my_username(text) from public, anon;
grant execute on function public.set_my_username(text) to authenticated;

-- Only the Edge Function's service role can resolve an alias or consume limits.
create or replace function public.iag_resolve_username(login_username text) returns text
language sql security definer set search_path = '' as $$
  select u.email::text from iag_private.usernames n join auth.users u on u.id=n.user_id
  where n.username=login_username;
$$;
revoke all on function public.iag_resolve_username(text) from public, anon, authenticated;
grant execute on function public.iag_resolve_username(text) to service_role;

create or replace function public.iag_allow_login(login_bucket text, max_attempts integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare total integer;
begin
  -- Old hashed buckets are disposable; no raw addresses, usernames or passwords are stored.
  delete from iag_private.login_limits where window_start < now() - interval '1 day';
  insert into iag_private.login_limits(bucket, window_start, attempts) values(login_bucket, now(), 1)
  on conflict(bucket) do update set
    attempts = case when iag_private.login_limits.window_start < now()-interval '15 minutes' then 1 else iag_private.login_limits.attempts+1 end,
    window_start = case when iag_private.login_limits.window_start < now()-interval '15 minutes' then now() else iag_private.login_limits.window_start end
  returning attempts into total;
  return total <= max_attempts;
end;
$$;
revoke all on function public.iag_allow_login(text, integer) from public, anon, authenticated;
grant execute on function public.iag_allow_login(text, integer) to service_role;
