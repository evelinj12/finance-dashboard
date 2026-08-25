-- Phase 1 workflow/data foundation.
-- Adds Team work tracking, dashboard preferences, net-worth category detail,
-- income payment metadata, and a v3 monthly summary view.

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  default_currency text not null default 'IDR',
  notes text,
  created_at timestamptz not null default now()
);

insert into public.team_members (name, active, default_currency)
values ('Kevin', true, 'IDR')
on conflict (name) do update set active = true;

create table if not exists public.team_work_entries (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null references public.team_members(id) on delete restrict,
  income_source_id uuid references public.income_sources(id) on delete set null,
  source_contractor_payment_id uuid unique references public.contractor_payments(id) on delete set null,
  date date not null,
  description text,
  work_period text,
  hours numeric(10, 2),
  amount numeric(14, 2) not null,
  currency text not null default 'IDR',
  fx_rate numeric(14, 6) not null default 1,
  amount_idr numeric(14, 0) not null,
  status text not null default 'owed' check (status in ('owed', 'paid')),
  paid_at date,
  source_sheet text,
  source_row text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists team_work_entries_team_member_idx
  on public.team_work_entries (team_member_id);

create index if not exists team_work_entries_income_source_idx
  on public.team_work_entries (income_source_id);

create index if not exists team_work_entries_date_idx
  on public.team_work_entries (date);

alter table public.team_work_entries
  add column if not exists source_contractor_payment_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'team_work_entries_source_contractor_payment_id_fkey'
      and conrelid = 'public.team_work_entries'::regclass
  ) then
    alter table public.team_work_entries
      add constraint team_work_entries_source_contractor_payment_id_fkey
      foreign key (source_contractor_payment_id)
      references public.contractor_payments(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'team_work_entries_source_contractor_payment_id_key'
      and conrelid = 'public.team_work_entries'::regclass
  ) then
    alter table public.team_work_entries
      add constraint team_work_entries_source_contractor_payment_id_key
      unique (source_contractor_payment_id);
  end if;
end $$;

alter table public.income_transactions
  add column if not exists payment_status text,
  add column if not exists total_hours numeric(10, 2);

update public.income_transactions
set payment_status = case
    when lower(btrim(coalesce(status, ''))) in ('waiting', 'pending', 'unpaid', 'owed') then 'waiting'
    when lower(btrim(coalesce(payment_status, ''))) in ('waiting', 'pending', 'unpaid', 'owed') then 'waiting'
    when lower(btrim(coalesce(status, ''))) in ('paid', 'success', 'completed', 'complete') then 'paid'
    when lower(btrim(coalesce(payment_status, ''))) in ('paid', 'success', 'completed', 'complete') then 'paid'
    else 'paid'
  end
where payment_status is null
   or payment_status not in ('waiting', 'paid')
   or lower(btrim(coalesce(status, ''))) in (
     'waiting',
     'pending',
     'unpaid',
     'owed',
     'paid',
     'success',
     'completed',
     'complete'
   );

alter table public.income_transactions
  alter column payment_status set default 'paid',
  alter column payment_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'income_transactions_payment_status_check'
      and conrelid = 'public.income_transactions'::regclass
  ) then
    alter table public.income_transactions
      add constraint income_transactions_payment_status_check
      check (payment_status in ('waiting', 'paid'));
  end if;
end $$;

create table if not exists public.dashboard_preferences (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Application actions that update dashboard_preferences are responsible for
-- writing updated_at.

create table if not exists public.net_worth_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  group_name text not null check (group_name in ('asset', 'liability')),
  sort_order integer not null default 0,
  active boolean not null default true,
  source_key text,
  created_at timestamptz not null default now()
);

create table if not exists public.net_worth_category_values (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.net_worth_snapshots(id) on delete cascade,
  category_id uuid not null references public.net_worth_categories(id) on delete restrict,
  amount_idr numeric(14, 0) not null default 0,
  notes text,
  unique (snapshot_id, category_id)
);

create index if not exists net_worth_category_values_snapshot_idx
  on public.net_worth_category_values (snapshot_id);

create index if not exists net_worth_category_values_category_idx
  on public.net_worth_category_values (category_id);

alter table public.team_members enable row level security;
alter table public.team_work_entries enable row level security;
alter table public.dashboard_preferences enable row level security;
alter table public.net_worth_categories enable row level security;
alter table public.net_worth_category_values enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'team_members',
    'team_work_entries',
    'dashboard_preferences',
    'net_worth_categories',
    'net_worth_category_values'
  ])
  loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = t
        and policyname = 'authenticated full access'
    ) then
      execute format(
        'create policy "authenticated full access" on public.%I for all to authenticated using (true) with check (true)',
        t
      );
    end if;
  end loop;
end $$;

grant select, insert, update, delete on table
  public.team_members,
  public.team_work_entries,
  public.dashboard_preferences,
  public.net_worth_categories,
  public.net_worth_category_values
to authenticated;

insert into public.net_worth_categories (name, group_name, sort_order, source_key)
values
  ('Cash', 'asset', 10, 'cash'),
  ('Investments', 'asset', 20, 'investments'),
  ('Retirement', 'asset', 30, 'retirement'),
  ('Personal assets', 'asset', 40, 'personal'),
  ('Unsecured liabilities', 'liability', 50, 'unsecured_liabilities'),
  ('Secured liabilities', 'liability', 60, 'secured_liabilities')
on conflict (name) do update set
  group_name = excluded.group_name,
  sort_order = excluded.sort_order,
  source_key = excluded.source_key,
  active = true;

insert into public.net_worth_category_values (snapshot_id, category_id, amount_idr)
select
  s.id,
  c.id,
  case c.source_key
    when 'cash' then s.cash
    when 'investments' then s.investments
    when 'retirement' then s.retirement
    when 'personal' then s.personal
    when 'unsecured_liabilities' then s.unsecured_liabilities
    when 'secured_liabilities' then s.secured_liabilities
    else 0
  end
from public.net_worth_snapshots s
join public.net_worth_categories c
  on c.source_key in (
    'cash',
    'investments',
    'retirement',
    'personal',
    'unsecured_liabilities',
    'secured_liabilities'
  )
on conflict (snapshot_id, category_id) do nothing;

insert into public.dashboard_preferences (key, value)
values (
  'nav',
  '{"order":["overview","budget","saving-health","transactions","income","team","networth","exports","settings"],"hidden":[]}'::jsonb
)
on conflict (key) do nothing;

insert into public.team_work_entries (
  team_member_id,
  income_source_id,
  source_contractor_payment_id,
  date,
  description,
  work_period,
  hours,
  amount,
  currency,
  fx_rate,
  amount_idr,
  status,
  paid_at,
  source_sheet,
  source_row,
  notes
)
select
  tm.id,
  coalesce(related_src.id, name_match.id),
  cp.id,
  cp.date,
  cp.client_or_project,
  cp.work_period,
  cp.hours,
  cp.amount,
  cp.currency,
  cp.fx_rate,
  cp.amount_idr,
  case when cp.status in ('paid', 'transferred') then 'paid' else 'owed' end,
  case when cp.status in ('paid', 'transferred') then coalesce(cp.paid_at, cp.date) else null end,
  cp.source_sheet,
  cp.source_row,
  cp.notes
from public.contractor_payments cp
join public.team_members tm
  on lower(btrim(tm.name)) = 'kevin'
left join public.income_transactions related_it
  on related_it.id = cp.related_income_transaction_id
left join public.income_sources related_src
  on related_src.id = related_it.income_source_id
  and related_src.type = 'freelance_client'
left join lateral (
  select i.id
  from public.income_sources i
  where lower(i.name) = lower(cp.client_or_project)
    and i.type = 'freelance_client'
  order by i.active desc, i.created_at desc
  limit 1
) name_match on true
where cp.status in ('owed', 'paid', 'transferred')
  and lower(btrim(cp.payee)) in ('kevin', 'brother', 'punya kev')
  and not exists (
  select 1
  from public.team_work_entries existing
  where existing.source_contractor_payment_id = cp.id
);

create or replace view public.monthly_finance_summary_v3
with (security_invoker = true) as
with months as (
  select distinct date_trunc('month', d)::date as month
  from (
    select month as d from public.budgets
    union all
    select date as d from public.transactions
    union all
    select date as d from public.income_transactions
    union all
    select month as d from public.monthly_income_rollups
    union all
    select date as d from public.contractor_payments
    union all
    select date as d from public.team_work_entries
  ) month_sources
),
income_by_month as (
  select
    date_trunc('month', it.date)::date as month,
    coalesce(sum(it.amount_idr), 0) as detailed_total_income,
    coalesce(sum(it.amount_idr) filter (where coalesce(src.active, true)), 0) as active_income,
    coalesce(sum(it.amount_idr) filter (where not coalesce(src.active, true)), 0) as inactive_income,
    coalesce(
      sum(it.amount_idr) filter (
        where src.type = 'freelance_client'
          and coalesce(src.active, true)
          and coalesce(src.visible_in_active_breakdown, true)
      ),
      0
    ) as active_visible_income,
    coalesce(
      sum(it.amount_idr) filter (
        where src.type = 'freelance_client'
          and coalesce(src.active, true)
          and not coalesce(src.visible_in_active_breakdown, true)
      ),
      0
    ) as active_hidden_income,
    coalesce(sum(it.amount_idr) filter (where src.type = 'freelance_client'), 0) as freelance_client_income,
    coalesce(sum(it.amount_idr) filter (where src.type = 'digital_product'), 0) as digital_product_income,
    coalesce(sum(it.amount_idr) filter (where src.type = 'other'), 0) as other_income
  from public.income_transactions it
  left join public.income_sources src on src.id = it.income_source_id
  group by 1
),
actuals_by_month as (
  select
    date_trunc('month', t.date)::date as month,
    count(*) filter (where c.tag in ('fixed', 'spent', 'sinking_fund')) as expense_or_saving_rows,
    coalesce(sum(t.amount_idr) filter (where c.tag = 'income' and t.direction = 'in'), 0)
      - coalesce(sum(t.amount_idr) filter (where c.tag = 'income' and t.direction = 'out'), 0)
      as category_income_actual,
    coalesce(sum(t.amount_idr) filter (where c.tag = 'fixed' and t.direction = 'out'), 0)
      - coalesce(sum(t.amount_idr) filter (where c.tag = 'fixed' and t.direction = 'in'), 0)
      as fixed_actual,
    coalesce(sum(t.amount_idr) filter (where c.tag = 'spent' and t.direction = 'out'), 0)
      - coalesce(sum(t.amount_idr) filter (where c.tag = 'spent' and t.direction = 'in'), 0)
      as variable_actual,
    coalesce(sum(t.amount_idr) filter (where c.tag = 'sinking_fund' and t.direction = 'out'), 0)
      - coalesce(sum(t.amount_idr) filter (where c.tag = 'sinking_fund' and t.direction = 'in'), 0)
      as sinking_fund_actual
  from public.transactions t
  join public.categories c on c.id = t.category_id
  group by 1
),
budgets_by_month as (
  select
    b.month,
    coalesce(sum(b.budget_amount) filter (where c.tag = 'income'), 0) as income_budget,
    coalesce(sum(b.budget_amount) filter (where c.tag = 'fixed'), 0) as fixed_budget,
    coalesce(sum(b.budget_amount) filter (where c.tag = 'spent'), 0) as variable_budget,
    coalesce(sum(b.budget_amount) filter (where c.tag = 'sinking_fund'), 0) as sinking_fund_budget
  from public.budgets b
  join public.categories c on c.id = b.category_id
  group by 1
),
contractor_by_month as (
  select
    date_trunc('month', date)::date as month,
    coalesce(sum(amount_idr) filter (where status in ('paid', 'transferred')), 0) as contractor_paid,
    coalesce(sum(amount_idr) filter (where status = 'owed'), 0) as contractor_owed
  from public.contractor_payments
  group by 1
),
team_by_month as (
  select
    date_trunc('month', twe.date)::date as month,
    coalesce(sum(twe.amount_idr) filter (where twe.status = 'paid'), 0) as team_paid,
    coalesce(sum(twe.amount_idr) filter (where twe.status = 'owed'), 0) as team_owed,
    coalesce(sum(twe.amount_idr), 0) as team_total,
    coalesce(
      sum(twe.amount_idr) filter (
        where src.type = 'freelance_client'
          and coalesce(src.active, true)
          and coalesce(src.visible_in_active_breakdown, true)
      ),
      0
    ) as team_active_visible_client_total,
    coalesce(
      sum(twe.amount_idr) filter (where src.type = 'freelance_client'),
      0
    ) as team_freelance_client_total
  from public.team_work_entries twe
  left join public.income_sources src on src.id = twe.income_source_id
  group by 1
),
contractor_fallback_by_month as (
  select
    date_trunc('month', cp.date)::date as month,
    coalesce(sum(cp.amount_idr) filter (where cp.status in ('paid', 'transferred')), 0) as fallback_team_paid,
    coalesce(sum(cp.amount_idr) filter (where cp.status = 'owed'), 0) as fallback_team_owed,
    coalesce(sum(cp.amount_idr), 0) as fallback_team_total,
    coalesce(
      sum(cp.amount_idr) filter (
        where src.type = 'freelance_client'
          and coalesce(src.active, true)
          and coalesce(src.visible_in_active_breakdown, true)
      ),
      0
    ) as fallback_team_active_visible_client_total,
    coalesce(
      sum(cp.amount_idr) filter (where src.type = 'freelance_client'),
      0
    ) as fallback_team_freelance_client_total
  from public.contractor_payments cp
  left join public.income_transactions related_it
    on related_it.id = cp.related_income_transaction_id
  left join public.income_sources related_src
    on related_src.id = related_it.income_source_id
    and related_src.type = 'freelance_client'
  left join lateral (
    select i.id
    from public.income_sources i
    where lower(i.name) = lower(cp.client_or_project)
      and i.type = 'freelance_client'
    order by i.active desc, i.created_at desc
    limit 1
  ) name_match on true
  left join public.income_sources src
    on src.id = coalesce(related_src.id, name_match.id)
  where cp.status in ('owed', 'paid', 'transferred')
    and lower(btrim(cp.payee)) in ('kevin', 'brother', 'punya kev')
    and not exists (
      select 1
      from public.team_work_entries twe
      where twe.source_contractor_payment_id = cp.id
    )
  group by 1
),
summary as (
  select
    m.month,
    coalesce(r.total_income_idr, i.detailed_total_income, 0) as total_income,
    coalesce(r.total_income_idr, 0) as monthly_rollup_income,
    coalesce(i.detailed_total_income, 0) as detailed_total_income,
    coalesce(i.active_income, 0) as active_income,
    coalesce(i.inactive_income, 0) as inactive_income,
    coalesce(i.active_visible_income, 0) as active_visible_income,
    coalesce(i.active_hidden_income, 0) as active_hidden_income,
    coalesce(i.freelance_client_income, 0) as freelance_client_income,
    coalesce(i.digital_product_income, 0) as digital_product_income,
    coalesce(i.other_income, 0) as other_income,
    coalesce(a.category_income_actual, 0) as category_income_actual,
    coalesce(a.fixed_actual, 0) as fixed_actual,
    coalesce(a.variable_actual, 0) as variable_actual,
    coalesce(a.sinking_fund_actual, 0) as sinking_fund_actual,
    coalesce(b.income_budget, 0) as income_budget,
    coalesce(b.fixed_budget, 0) as fixed_budget,
    coalesce(b.variable_budget, 0) as variable_budget,
    coalesce(b.sinking_fund_budget, 0) as sinking_fund_budget,
    coalesce(cp.contractor_paid, 0) as contractor_paid,
    coalesce(cp.contractor_owed, 0) as contractor_owed,
    coalesce(tw.team_paid, 0) + coalesce(cfb.fallback_team_paid, 0) as team_paid,
    coalesce(tw.team_owed, 0) + coalesce(cfb.fallback_team_owed, 0) as team_owed,
    coalesce(tw.team_total, 0) + coalesce(cfb.fallback_team_total, 0) as team_total,
    coalesce(tw.team_active_visible_client_total, 0)
      + coalesce(cfb.fallback_team_active_visible_client_total, 0)
      as team_active_visible_client_total,
    coalesce(tw.team_freelance_client_total, 0)
      + coalesce(cfb.fallback_team_freelance_client_total, 0)
      as team_freelance_client_total,
    (r.month is not null or i.month is not null) as has_income_data,
    coalesce(a.expense_or_saving_rows, 0) > 0 as has_expense_data
  from months m
  left join income_by_month i on i.month = m.month
  left join public.monthly_income_rollups r on r.month = m.month
  left join actuals_by_month a on a.month = m.month
  left join budgets_by_month b on b.month = m.month
  left join contractor_by_month cp on cp.month = m.month
  left join team_by_month tw on tw.month = m.month
  left join contractor_fallback_by_month cfb on cfb.month = m.month
),
final as (
  select
    month,
    total_income as total_income_idr,
    monthly_rollup_income as monthly_rollup_income_idr,
    detailed_total_income as detailed_total_income_idr,
    active_income as active_income_idr,
    inactive_income as inactive_income_idr,
    active_visible_income - team_active_visible_client_total as active_visible_income_idr,
    active_hidden_income as active_hidden_income_idr,
    freelance_client_income - team_freelance_client_total as freelance_client_income_idr,
    digital_product_income as digital_product_income_idr,
    other_income as other_income_idr,
    category_income_actual as category_income_actual_idr,
    category_income_actual as reconciliation_category_income_idr,
    fixed_actual as fixed_expenses_idr,
    variable_actual as variable_spend_idr,
    sinking_fund_actual as sinking_funds_idr,
    income_budget as income_budget_idr,
    fixed_budget as fixed_budget_idr,
    variable_budget as variable_budget_idr,
    sinking_fund_budget as sinking_budget_idr,
    contractor_paid as contractor_paid_idr,
    contractor_owed as contractor_owed_idr,
    team_owed as team_owed_idr,
    team_paid as team_paid_idr,
    team_total as team_total_idr,
    has_expense_data,
    has_income_data,
    has_income_data and has_expense_data as saving_health_identified,
    fixed_actual + variable_actual + team_total as true_expenses_idr,
    total_income - (fixed_actual + variable_actual + team_total) - sinking_fund_actual
      as net_after_savings_idr
  from summary
)
select
  month,
  total_income_idr,
  monthly_rollup_income_idr,
  detailed_total_income_idr,
  active_income_idr,
  inactive_income_idr,
  active_visible_income_idr,
  active_hidden_income_idr,
  freelance_client_income_idr,
  digital_product_income_idr,
  other_income_idr,
  category_income_actual_idr,
  reconciliation_category_income_idr,
  fixed_expenses_idr,
  variable_spend_idr,
  sinking_funds_idr,
  income_budget_idr,
  fixed_budget_idr,
  variable_budget_idr,
  sinking_budget_idr,
  contractor_paid_idr,
  contractor_owed_idr,
  true_expenses_idr,
  net_after_savings_idr,
  case
    when total_income_idr <= 0 then 0
    else greatest(
      least(
        sinking_funds_idr + greatest(net_after_savings_idr, 0),
        total_income_idr - true_expenses_idr
      ),
      0
    ) / total_income_idr
  end as saving_health_ratio,
  team_owed_idr,
  team_paid_idr,
  team_total_idr,
  has_expense_data,
  has_income_data,
  saving_health_identified
from final;

grant select on public.monthly_finance_summary_v3 to authenticated;
