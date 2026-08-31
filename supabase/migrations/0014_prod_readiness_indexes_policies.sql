-- Production readiness cleanup for Team access.
-- Keeps owner and team-member access in a single policy per action and covers FK indexes flagged by Supabase advisors.

create index if not exists contractor_payments_related_income_transaction_id_idx
  on public.contractor_payments (related_income_transaction_id);

create index if not exists sinking_funds_category_id_idx
  on public.sinking_funds (category_id);

drop policy if exists "owner full access" on public.income_sources;
drop policy if exists "team members can view active clients" on public.income_sources;
drop policy if exists "income sources select access" on public.income_sources;
drop policy if exists "owner insert access" on public.income_sources;
drop policy if exists "owner update access" on public.income_sources;
drop policy if exists "owner delete access" on public.income_sources;

create policy "income sources select access"
on public.income_sources
for select
to authenticated
using (
  app_private.is_dashboard_owner()
  or (
    app_private.is_team_access_user()
    and active = true
    and type = 'freelance_client'
  )
);

create policy "owner insert access"
on public.income_sources
for insert
to authenticated
with check (app_private.is_dashboard_owner());

create policy "owner update access"
on public.income_sources
for update
to authenticated
using (app_private.is_dashboard_owner())
with check (app_private.is_dashboard_owner());

create policy "owner delete access"
on public.income_sources
for delete
to authenticated
using (app_private.is_dashboard_owner());

drop policy if exists "owner full access" on public.team_members;
drop policy if exists "team members can view self" on public.team_members;
drop policy if exists "team members select access" on public.team_members;
drop policy if exists "owner insert access" on public.team_members;
drop policy if exists "owner update access" on public.team_members;
drop policy if exists "owner delete access" on public.team_members;

create policy "team members select access"
on public.team_members
for select
to authenticated
using (
  app_private.is_dashboard_owner()
  or id = app_private.current_team_member_id()
);

create policy "owner insert access"
on public.team_members
for insert
to authenticated
with check (app_private.is_dashboard_owner());

create policy "owner update access"
on public.team_members
for update
to authenticated
using (app_private.is_dashboard_owner())
with check (app_private.is_dashboard_owner());

create policy "owner delete access"
on public.team_members
for delete
to authenticated
using (app_private.is_dashboard_owner());

drop policy if exists "owner full access" on public.team_member_access;
drop policy if exists "team members can view own access" on public.team_member_access;
drop policy if exists "team members can claim invited access" on public.team_member_access;
drop policy if exists "team member access select access" on public.team_member_access;
drop policy if exists "team member access update access" on public.team_member_access;
drop policy if exists "owner insert access" on public.team_member_access;
drop policy if exists "owner delete access" on public.team_member_access;

create policy "team member access select access"
on public.team_member_access
for select
to authenticated
using (
  app_private.is_dashboard_owner()
  or (
    active = true
    and (
      user_id = (select auth.uid())
      or (
        email is not null
        and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      )
    )
  )
);

create policy "team member access update access"
on public.team_member_access
for update
to authenticated
using (
  app_private.is_dashboard_owner()
  or (
    active = true
    and user_id is null
    and email is not null
    and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
)
with check (
  app_private.is_dashboard_owner()
  or (
    active = true
    and user_id = (select auth.uid())
    and email is not null
    and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
);

create policy "owner insert access"
on public.team_member_access
for insert
to authenticated
with check (app_private.is_dashboard_owner());

create policy "owner delete access"
on public.team_member_access
for delete
to authenticated
using (app_private.is_dashboard_owner());

drop policy if exists "owner full access" on public.team_work_entries;
drop policy if exists "team members can view own entries" on public.team_work_entries;
drop policy if exists "team members can submit entries" on public.team_work_entries;
drop policy if exists "team work entries select access" on public.team_work_entries;
drop policy if exists "team work entries insert access" on public.team_work_entries;
drop policy if exists "owner update access" on public.team_work_entries;
drop policy if exists "owner delete access" on public.team_work_entries;

create policy "team work entries select access"
on public.team_work_entries
for select
to authenticated
using (
  app_private.is_dashboard_owner()
  or team_member_id = app_private.current_team_member_id()
);

create policy "team work entries insert access"
on public.team_work_entries
for insert
to authenticated
with check (
  app_private.is_dashboard_owner()
  or (
    team_member_id = app_private.current_team_member_id()
    and status = 'need_approval'
    and amount = 0
    and amount_idr = 0
    and paid_at is null
    and transfer_group_id is null
  )
);

create policy "owner update access"
on public.team_work_entries
for update
to authenticated
using (app_private.is_dashboard_owner())
with check (app_private.is_dashboard_owner());

create policy "owner delete access"
on public.team_work_entries
for delete
to authenticated
using (app_private.is_dashboard_owner());
