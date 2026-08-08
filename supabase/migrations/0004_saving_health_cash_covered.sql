-- Keep saving health within what the month actually earned.
-- Sinking-fund contributions only count as savings when they are covered by
-- income after true expenses; otherwise the ratio can exceed 100% during an
-- incomplete or deficit month.

create or replace view monthly_finance_summary
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
    select date as d from contractor_payments
  ) month_sources
),
income_by_month as (
  select
    date_trunc('month', it.date)::date as month,
    coalesce(sum(it.amount_idr), 0) as total_income,
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
    coalesce(i.total_income, 0) as total_income,
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
  left join actuals_by_month a on a.month = m.month
  left join budgets_by_month b on b.month = m.month
  left join contractor_by_month cp on cp.month = m.month
),
final as (
  select
    month,
    total_income as total_income_idr,
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
