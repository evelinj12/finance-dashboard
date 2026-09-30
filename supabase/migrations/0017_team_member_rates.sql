create table if not exists public.team_member_rates (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  income_source_id uuid not null references public.income_sources(id) on delete cascade,
  month date not null,
  hourly_rate numeric(14,2) not null check (hourly_rate > 0),
  currency text not null default 'IDR' check (currency in ('IDR', 'USD', 'AUD')),
  fx_rate numeric(14,6) not null default 1 check (fx_rate > 0),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_member_id, income_source_id, month)
);

create index if not exists team_member_rates_lookup_idx
  on public.team_member_rates (month, team_member_id, income_source_id)
  where active = true;

alter table public.team_member_rates enable row level security;

drop policy if exists "owner select access" on public.team_member_rates;
drop policy if exists "owner insert access" on public.team_member_rates;
drop policy if exists "owner update access" on public.team_member_rates;
drop policy if exists "owner delete access" on public.team_member_rates;

create policy "owner select access"
on public.team_member_rates
for select
to authenticated
using ((select app_private.is_dashboard_owner()));

create policy "owner insert access"
on public.team_member_rates
for insert
to authenticated
with check ((select app_private.is_dashboard_owner()));

create policy "owner update access"
on public.team_member_rates
for update
to authenticated
using ((select app_private.is_dashboard_owner()))
with check ((select app_private.is_dashboard_owner()));

create policy "owner delete access"
on public.team_member_rates
for delete
to authenticated
using ((select app_private.is_dashboard_owner()));

grant select, insert, update, delete on table public.team_member_rates to authenticated;
