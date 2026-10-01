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
    coalesce(r.total_income_idr, i.detailed_total_income, 0) as gross_total_income,
    coalesce(r.total_income_idr, 0) as monthly_rollup_income,
    coalesce(i.detailed_total_income, 0) as detailed_total_income,
    coalesce(i.active_income, 0) as active_income,
    coalesce(i.inactive_income, 0) as inactive_income,
    coalesce(i.active_visible_income, 0) as active_visible_income,
    coalesce(i.active_hidden_income, 0) as active_hidden_income,
    case
      when i.month is not null then coalesce(i.freelance_client_income, 0)
      else coalesce(r.client_income_idr, 0)
    end as gross_freelance_client_income,
    case
      when i.month is not null then coalesce(i.digital_product_income, 0)
      else coalesce(r.digital_product_income_idr, 0)
    end as digital_product_income,
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
    gross_freelance_client_income - team_freelance_client_total + digital_product_income as total_income_idr,
    monthly_rollup_income as monthly_rollup_income_idr,
    detailed_total_income as detailed_total_income_idr,
    active_income as active_income_idr,
    inactive_income as inactive_income_idr,
    active_visible_income - team_active_visible_client_total as active_visible_income_idr,
    active_hidden_income as active_hidden_income_idr,
    gross_freelance_client_income - team_freelance_client_total as freelance_client_income_idr,
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
    fixed_actual + variable_actual as true_expenses_idr,
    gross_freelance_client_income - team_freelance_client_total + digital_product_income
      - (fixed_actual + variable_actual)
      - sinking_fund_actual
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
