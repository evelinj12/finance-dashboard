-- Use the user's curated monthly income summary from Income Record / All clients
-- for saving-health and top-level monthly rollups. Detailed income transactions
-- remain available for source-level analysis and exports.

create table if not exists monthly_income_rollups (
  month date primary key,
  client_income_idr numeric not null default 0,
  digital_product_income_idr numeric not null default 0,
  total_income_idr numeric not null,
  source text not null default 'manual' check (source in ('manual', 'import')),
  source_sheet text,
  source_row text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table monthly_income_rollups enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'monthly_income_rollups'
      and policyname = 'authenticated full access'
  ) then
    create policy "authenticated full access"
      on monthly_income_rollups
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

insert into monthly_income_rollups (
  month,
  client_income_idr,
  digital_product_income_idr,
  total_income_idr,
  source,
  source_sheet,
  source_row,
  notes
) values
  ('2025-01-01', 5678572.00, 111551.00, 5790123.00, 'import', 'All clients', '16', 'Clients + Lynk rollup'),
  ('2025-02-01', 13368328.30, 10270518.00, 23638846.30, 'import', 'All clients', '17', 'Clients + Lynk rollup'),
  ('2025-03-01', 12561568.90, 21505538.00, 34067106.90, 'import', 'All clients', '18', 'Clients + Lynk rollup'),
  ('2025-04-01', 13042846.00, 13737644.00, 26780490.00, 'import', 'All clients', '19', 'Clients + Lynk rollup'),
  ('2025-05-01', 16553621.20, 10865162.00, 27418783.20, 'import', 'All clients', '20', 'Clients + Lynk rollup'),
  ('2025-06-01', 19720377.25, 10560128.00, 30280505.25, 'import', 'All clients', '21', 'Clients + Lynk rollup'),
  ('2025-07-01', 20210949.10, 19138216.40, 39349165.50, 'import', 'All clients', '22', 'Clients + Lynk rollup'),
  ('2025-08-01', 22599130.90, 10270166.00, 32869296.90, 'import', 'All clients', '23', 'Clients + Lynk rollup'),
  ('2025-09-01', 23251287.20, 15182992.90, 38434280.10, 'import', 'All clients', '24', 'Clients + Lynk rollup'),
  ('2025-10-01', 20886292.00, 9770965.20, 30657257.20, 'import', 'All clients', '25', 'Clients + Lynk rollup'),
  ('2025-11-01', 15393964.00, 8200671.00, 23594635.00, 'import', 'All clients', '26', 'Clients + Lynk rollup'),
  ('2025-12-01', 15862940.72, 7558065.40, 23421006.12, 'import', 'All clients', '27', 'Clients + Lynk rollup'),
  ('2026-01-01', 17246162.00, 7074064.50, 24320226.50, 'import', 'All clients', '32', 'Clients + Lynk rollup'),
  ('2026-02-01', 19736345.00, 6828558.00, 26564903.00, 'import', 'All clients', '33', 'Clients + Lynk rollup'),
  ('2026-03-01', 21870220.00, 6684610.00, 28554830.00, 'import', 'All clients', '34', 'Clients + Lynk rollup'),
  ('2026-04-01', 23554342.00, 5760345.00, 29314687.00, 'import', 'All clients', '35', 'Clients + Lynk rollup'),
  ('2026-05-01', 18257994.00, 6855766.00, 25113760.00, 'import', 'All clients', '36', 'Clients + Lynk rollup'),
  ('2026-06-01', 21346267.00, 2395658.00, 23741925.00, 'import', 'All clients', '37', 'Clients + Lynk rollup'),
  ('2026-07-01', 26902522.004166666, 3107880.00, 30010402.004166666, 'import', 'All clients', '38', 'Clients + Lynk rollup')
on conflict (month) do update set
  client_income_idr = excluded.client_income_idr,
  digital_product_income_idr = excluded.digital_product_income_idr,
  total_income_idr = excluded.total_income_idr,
  source = excluded.source,
  source_sheet = excluded.source_sheet,
  source_row = excluded.source_row,
  notes = excluded.notes,
  updated_at = now();

update income_sources
set name = 'Client 13 (historical)',
    active = false,
    visible_in_active_breakdown = false,
    source_key = 'historical_client_13'
where name = 'Z PD'
  and type = 'freelance_client'
  and exists (
    select 1
    from income_transactions it
    where it.income_source_id = income_sources.id
      and it.date < date '2025-01-01'
  );

update income_sources
set name = 'Z PD',
    active = true,
    visible_in_active_breakdown = true,
    source_key = 'z_pd'
where name = 'Client 10 (since Jul 2026)'
  and type = 'freelance_client';

update income_sources
set source_key = case name
    when 'Agent EA' then 'agent_ea'
    when 'Erica - BCC' then 'erica_bcc'
    when 'JML Media' then 'jml_media'
    when 'Jasper' then 'jasper'
    when 'Z PD' then 'z_pd'
    else source_key
  end
where type = 'freelance_client'
  and name in ('Agent EA', 'Erica - BCC', 'JML Media', 'Jasper', 'Z PD');

create or replace view monthly_finance_summary_v2
with (security_invoker = true) as
with months as (
  select distinct date_trunc('month', d)::date as month
  from (
    select month as d from budgets
    union all
    select date as d from transactions
    union all
    select date as d from income_transactions
    union all
    select month as d from monthly_income_rollups
    union all
    select date as d from contractor_payments
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
  from income_transactions it
  left join income_sources src on src.id = it.income_source_id
  group by 1
),
actuals_by_month as (
  select
    date_trunc('month', t.date)::date as month,
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
  from transactions t
  join categories c on c.id = t.category_id
  group by 1
),
budgets_by_month as (
  select
    b.month,
    coalesce(sum(b.budget_amount) filter (where c.tag = 'income'), 0) as income_budget,
    coalesce(sum(b.budget_amount) filter (where c.tag = 'fixed'), 0) as fixed_budget,
    coalesce(sum(b.budget_amount) filter (where c.tag = 'spent'), 0) as variable_budget,
    coalesce(sum(b.budget_amount) filter (where c.tag = 'sinking_fund'), 0) as sinking_fund_budget
  from budgets b
  join categories c on c.id = b.category_id
  group by 1
),
contractor_by_month as (
  select
    date_trunc('month', date)::date as month,
    coalesce(sum(amount_idr) filter (where status in ('paid', 'transferred')), 0) as contractor_paid,
    coalesce(sum(amount_idr) filter (where status = 'owed'), 0) as contractor_owed
  from contractor_payments
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
    coalesce(cp.contractor_owed, 0) as contractor_owed
  from months m
  left join income_by_month i on i.month = m.month
  left join monthly_income_rollups r on r.month = m.month
  left join actuals_by_month a on a.month = m.month
  left join budgets_by_month b on b.month = m.month
  left join contractor_by_month cp on cp.month = m.month
),
final as (
  select
    month,
    total_income as total_income_idr,
    monthly_rollup_income as monthly_rollup_income_idr,
    detailed_total_income as detailed_total_income_idr,
    active_income as active_income_idr,
    inactive_income as inactive_income_idr,
    active_visible_income as active_visible_income_idr,
    active_hidden_income as active_hidden_income_idr,
    freelance_client_income as freelance_client_income_idr,
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
    fixed_actual + variable_actual + contractor_paid as true_expenses_idr,
    total_income - (fixed_actual + variable_actual + contractor_paid) - sinking_fund_actual
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
  end as saving_health_ratio
from final;
