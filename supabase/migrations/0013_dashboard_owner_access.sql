-- Explicit owner allowlist for the dashboard.
-- This prevents future Team access signups from being treated as dashboard owners.

create schema if not exists app_private;

create table if not exists app_private.dashboard_owners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  email text unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into app_private.dashboard_owners (user_id, email, active)
select id, lower(email), true
from auth.users
where email is not null
on conflict (user_id) do update set
  email = excluded.email,
  active = true;

create or replace function app_private.is_dashboard_owner()
returns boolean
language sql
stable
security definer
set search_path = app_private, public
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from app_private.dashboard_owners owner
      where owner.active = true
        and (
          owner.user_id = (select auth.uid())
          or (
            owner.email is not null
            and lower(owner.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
          )
        )
    );
$$;

revoke all on function app_private.is_dashboard_owner() from public;
grant execute on function app_private.is_dashboard_owner() to authenticated;
