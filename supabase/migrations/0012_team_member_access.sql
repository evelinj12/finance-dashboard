-- Team member access portal.
-- Lets linked team members submit work for approval while keeping the owner dashboard private.

create schema if not exists app_private;

create table if not exists public.team_member_access (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  active boolean not null default true,
  notes text,
  invited_at timestamptz not null default now(),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (team_member_id),
  unique (user_id),
  unique (email)
);

alter table public.team_work_entries
  drop constraint if exists team_work_entries_status_check;

alter table public.team_work_entries
  alter column amount set default 0,
  alter column amount_idr set default 0,
  add constraint team_work_entries_status_check
    check (status in ('need_approval', 'owed', 'paid'));

create or replace function app_private.is_team_access_user()
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.team_member_access access
      where access.user_id = (select auth.uid())
         or (
           access.email is not null
           and lower(access.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
         )
    );
$$;

create or replace function app_private.is_dashboard_owner()
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select (select auth.uid()) is not null
    and not app_private.is_team_access_user();
$$;

create or replace function app_private.current_team_member_id()
returns uuid
language sql
stable
security definer
set search_path = public, app_private
as $$
  select access.team_member_id
  from public.team_member_access access
  where access.active = true
    and (
      access.user_id = (select auth.uid())
      or (
        access.email is not null
        and lower(access.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      )
    )
  order by access.created_at
  limit 1;
$$;

revoke all on function app_private.is_team_access_user() from public;
revoke all on function app_private.is_dashboard_owner() from public;
revoke all on function app_private.current_team_member_id() from public;
grant execute on function app_private.is_team_access_user() to authenticated;
grant execute on function app_private.is_dashboard_owner() to authenticated;
grant execute on function app_private.current_team_member_id() to authenticated;

alter table public.team_member_access enable row level security;

drop policy if exists "authenticated full access" on public.team_member_access;
drop policy if exists "owner full access" on public.team_member_access;
drop policy if exists "team members can view own access" on public.team_member_access;
drop policy if exists "team members can claim invited access" on public.team_member_access;

create policy "owner full access"
on public.team_member_access
for all
to authenticated
using (app_private.is_dashboard_owner())
with check (app_private.is_dashboard_owner());

create policy "team members can view own access"
on public.team_member_access
for select
to authenticated
using (
  active = true
  and (
    user_id = (select auth.uid())
    or (
      email is not null
      and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    )
  )
);

create policy "team members can claim invited access"
on public.team_member_access
for update
to authenticated
using (
  active = true
  and user_id is null
  and email is not null
  and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
)
with check (
  active = true
  and user_id = (select auth.uid())
  and email is not null
  and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
);

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'categories',
    'sinking_funds',
    'budgets',
    'transactions',
    'income_transactions',
    'contractor_payments',
    'net_worth_snapshots',
    'goals',
    'dashboard_preferences',
    'net_worth_categories',
    'net_worth_category_values',
    'monthly_income_rollups',
    'fixed_transactions',
    'recurring_transaction_skips',
    'sticky_notes',
    'family_support_entries',
    'family_support_transfers',
    'transaction_checklist_items'
  ])
  loop
    execute format('drop policy if exists "authenticated full access" on public.%I', t);
    execute format('drop policy if exists "owner full access" on public.%I', t);
    execute format(
      'create policy "owner full access" on public.%I for all to authenticated using (app_private.is_dashboard_owner()) with check (app_private.is_dashboard_owner())',
      t
    );
  end loop;
end $$;

drop policy if exists "authenticated full access" on public.income_sources;
drop policy if exists "owner full access" on public.income_sources;
drop policy if exists "team members can view active clients" on public.income_sources;
create policy "owner full access"
on public.income_sources
for all
to authenticated
using (app_private.is_dashboard_owner())
with check (app_private.is_dashboard_owner());

create policy "team members can view active clients"
on public.income_sources
for select
to authenticated
using (
  app_private.is_team_access_user()
  and active = true
  and type = 'freelance_client'
);

drop policy if exists "authenticated full access" on public.team_members;
drop policy if exists "owner full access" on public.team_members;
drop policy if exists "team members can view self" on public.team_members;
create policy "owner full access"
on public.team_members
for all
to authenticated
using (app_private.is_dashboard_owner())
with check (app_private.is_dashboard_owner());

create policy "team members can view self"
on public.team_members
for select
to authenticated
using (id = app_private.current_team_member_id());

drop policy if exists "authenticated full access" on public.team_work_entries;
drop policy if exists "owner full access" on public.team_work_entries;
drop policy if exists "team members can view own entries" on public.team_work_entries;
drop policy if exists "team members can submit entries" on public.team_work_entries;
create policy "owner full access"
on public.team_work_entries
for all
to authenticated
using (app_private.is_dashboard_owner())
with check (app_private.is_dashboard_owner());

create policy "team members can view own entries"
on public.team_work_entries
for select
to authenticated
using (team_member_id = app_private.current_team_member_id());

create policy "team members can submit entries"
on public.team_work_entries
for insert
to authenticated
with check (
  team_member_id = app_private.current_team_member_id()
  and status = 'need_approval'
  and amount = 0
  and amount_idr = 0
  and paid_at is null
  and transfer_group_id is null
);

do $$
begin
  execute 'alter view if exists public.monthly_finance_summary set (security_invoker = true)';
  execute 'alter view if exists public.monthly_finance_summary_v2 set (security_invoker = true)';
  execute 'alter view if exists public.monthly_finance_summary_v3 set (security_invoker = true)';
exception
  when others then
    null;
end $$;

grant select, insert, update, delete on table public.team_member_access to authenticated;
