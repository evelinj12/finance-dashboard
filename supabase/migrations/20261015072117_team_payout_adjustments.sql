create table public.team_payout_adjustments (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null references public.team_members(id) on delete restrict,
  date date not null,
  reason text not null check (length(btrim(reason)) between 1 and 500),
  amount_idr numeric not null check (amount_idr > 0 and amount_idr = round(amount_idr)),
  expense_transaction_id uuid references public.transactions(id) on delete restrict,
  created_at timestamptz not null default now()
);
create table public.team_adjustment_settlements (
  id uuid primary key default gen_random_uuid(),
  adjustment_id uuid not null references public.team_payout_adjustments(id) on delete restrict,
  team_member_id uuid not null references public.team_members(id) on delete restrict,
  amount_idr numeric not null check (amount_idr > 0),
  settled_at date not null,
  transfer_group_id uuid,
  created_at timestamptz not null default now(),
  unique (adjustment_id, transfer_group_id)
);
create index on public.team_payout_adjustments(team_member_id, date);
create index on public.team_payout_adjustments(expense_transaction_id);
create index on public.team_adjustment_settlements(adjustment_id);
create index on public.team_adjustment_settlements(team_member_id, settled_at);
create index on public.team_adjustment_settlements(transfer_group_id);

alter table public.team_payout_adjustments enable row level security;
alter table public.team_adjustment_settlements enable row level security;
create policy "adjustments read" on public.team_payout_adjustments for select to authenticated
  using ((select app_private.is_dashboard_owner()) or team_member_id = (select app_private.current_team_member_id()));
create policy "adjustments owner" on public.team_payout_adjustments for all to authenticated
  using ((select app_private.is_dashboard_owner())) with check ((select app_private.is_dashboard_owner()));
create policy "settlements read" on public.team_adjustment_settlements for select to authenticated
  using ((select app_private.is_dashboard_owner()) or team_member_id = (select app_private.current_team_member_id()));
create policy "settlements owner" on public.team_adjustment_settlements for all to authenticated
  using ((select app_private.is_dashboard_owner())) with check ((select app_private.is_dashboard_owner()));
grant select, insert, update, delete on public.team_payout_adjustments, public.team_adjustment_settlements to authenticated;

alter table public.transactions add column source_team_adjustment_id uuid unique
  references public.team_payout_adjustments(id) on delete cascade;
alter table public.transactions drop constraint transactions_source_check;
alter table public.transactions add constraint transactions_source_check
  check (source in ('manual', 'import', 'auto_monthly', 'income_auto', 'team_transfer', 'team_reimbursement'));

-- Member locks serialize payouts and direct repayments, including separate browser tabs.
create function public.manage_team_adjustment(
  p_operation text, p_id uuid, p_member_id uuid, p_date date,
  p_amount numeric, p_reason text, p_expense_id uuid, p_request_id uuid default null
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  a public.team_payout_adjustments%rowtype;
  expense public.transactions%rowtype;
  remaining numeric;
begin
  if not coalesce(app_private.is_dashboard_owner(), false) then raise exception 'Owner access required'; end if;
  perform 1 from public.team_members where id = p_member_id for update;
  if not found then raise exception 'Team member not found'; end if;
  if p_operation = 'add' then
    if p_date is null or p_amount is null or p_amount <= 0 or p_amount <> round(p_amount)
      or p_amount::text in ('NaN', 'Infinity', '-Infinity') or length(btrim(coalesce(p_reason,''))) = 0 then
      raise exception 'Enter a date, reason and positive whole IDR amount';
    end if;
    if p_expense_id is not null then
      select * into strict expense from public.transactions where id = p_expense_id for update;
      if expense.direction <> 'out' or expense.source in ('team_transfer','team_reimbursement','income_auto')
        or not exists (select 1 from public.categories where id = expense.category_id and tag in ('fixed','spent')) then
        raise exception 'Choose a personal expense transaction';
      end if;
      if p_amount + coalesce((select sum(amount_idr) from public.team_payout_adjustments where expense_transaction_id = p_expense_id),0)
        > expense.amount_idr then raise exception 'Shared amounts exceed the original expense'; end if;
    end if;
    insert into public.team_payout_adjustments(id,team_member_id,date,reason,amount_idr,expense_transaction_id)
      values(p_id,p_member_id,p_date,btrim(p_reason),p_amount,p_expense_id);
    if p_expense_id is not null then
      insert into public.transactions(date,category_id,direction,amount,currency,fx_rate,amount_idr,notes,source,source_team_adjustment_id)
        values(expense.date,expense.category_id,'in',p_amount,'IDR',1,p_amount,
          'Reimbursable share: ' || btrim(p_reason),'team_reimbursement',p_id);
    end if;
  else
    select * into strict a from public.team_payout_adjustments where id = p_id and team_member_id = p_member_id for update;
    remaining := a.amount_idr - coalesce((select sum(amount_idr) from public.team_adjustment_settlements where adjustment_id = a.id),0);
    if p_operation = 'repay' then
      if p_request_id is not null and exists(select 1 from public.team_adjustment_settlements where id=p_request_id) then
        if exists(select 1 from public.team_adjustment_settlements where id=p_request_id and adjustment_id=a.id
          and amount_idr=p_amount and settled_at=p_date and transfer_group_id is null) then return; end if;
        raise exception 'Repayment request does not match the recorded payment';
      end if;
      if p_date is null or p_date < a.date or p_amount is null or p_amount <= 0 or p_amount > remaining
        or p_amount <> round(p_amount) or p_amount::text in ('NaN','Infinity','-Infinity') then
        raise exception 'Repayment must be within the outstanding balance and dated on or after the adjustment';
      end if;
      insert into public.team_adjustment_settlements(id,adjustment_id,team_member_id,amount_idr,settled_at)
        values(coalesce(p_request_id,gen_random_uuid()),a.id,a.team_member_id,p_amount,p_date);
    elsif p_operation = 'delete' then
      if exists(select 1 from public.team_adjustment_settlements where adjustment_id = a.id) then
        raise exception 'Settled adjustments cannot be deleted';
      end if;
      delete from public.team_payout_adjustments where id = a.id;
    else raise exception 'Unknown adjustment operation';
    end if;
  end if;
end; $$;

create function public.settle_team_payout(p_entry_ids uuid[], p_paid_at date, p_notes text default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  member_id uuid;
  member_name text;
  entry_count int;
  gross numeric;
  available numeric;
  remaining numeric;
  used numeric;
  category_id uuid;
  group_id uuid := gen_random_uuid();
  a public.team_payout_adjustments%rowtype;
begin
  if not coalesce(app_private.is_dashboard_owner(),false) then raise exception 'Owner access required'; end if;
  if p_paid_at is null or coalesce(cardinality(p_entry_ids),0) = 0 then raise exception 'Choose entries and a paid date'; end if;
  select team_member_id into member_id from public.team_work_entries where id = any(p_entry_ids) limit 1;
  select name into member_name from public.team_members where id = member_id for update;
  if not found then raise exception 'Team member not found'; end if;
  perform 1 from public.team_work_entries where id = any(p_entry_ids) order by id for update;
  select count(*),sum(amount_idr) into entry_count,gross from public.team_work_entries
    where id = any(p_entry_ids) and team_member_id = member_id and status in ('owed','need_approval') and amount_idr > 0;
  if entry_count <> (select count(distinct id) from unnest(p_entry_ids) id) then
    raise exception 'Entries changed or are already paid. Refresh and retry';
  end if;
  available := gross;
  for a in select * from public.team_payout_adjustments
    where team_member_id = member_id and date <= p_paid_at order by date,id for update loop
    remaining := a.amount_idr - coalesce((select sum(amount_idr) from public.team_adjustment_settlements where adjustment_id = a.id),0);
    used := least(available,remaining);
    if used > 0 then
      insert into public.team_adjustment_settlements(adjustment_id,team_member_id,amount_idr,settled_at,transfer_group_id)
        values(a.id,member_id,used,p_paid_at,group_id);
      available := available - used;
    end if;
    exit when available <= 0;
  end loop;
  select id into category_id from public.categories where source_key = 'team_payout' limit 1;
  if category_id is null then
    insert into public.categories(name,tag,source_key,sort_order) values('Team payout','spent','team_payout',960)
      returning id into category_id;
  end if;
  update public.team_work_entries set status='paid',paid_at=p_paid_at,transfer_group_id=group_id where id=any(p_entry_ids);
  insert into public.transactions(date,category_id,direction,amount,currency,fx_rate,amount_idr,notes,source,generated_from,source_team_transfer_group_id)
    values(p_paid_at,category_id,'out',available,'IDR',1,available,
      coalesce(nullif(btrim(p_notes),''),'Team payout - ' || member_name),
      'team_transfer','team_transfer',group_id);
  return group_id;
end; $$;

-- Reopening a payout releases its deductions in the same transaction.
create function public.reopen_team_payouts(p_member_id uuid,p_month date)
returns void language plpgsql security invoker set search_path = '' as $$
declare groups uuid[];
begin
  if not coalesce(app_private.is_dashboard_owner(),false) then raise exception 'Owner access required'; end if;
  perform 1 from public.team_members where id=p_member_id for update;
  select array_agg(distinct transfer_group_id) into groups from public.team_work_entries
    where team_member_id=p_member_id and date>=p_month and date<(p_month+interval '1 month') and transfer_group_id is not null;
  delete from public.team_adjustment_settlements where transfer_group_id=any(groups);
  update public.team_work_entries set status='owed',paid_at=null,transfer_group_id=null where transfer_group_id=any(groups);
  delete from public.transactions where source_team_transfer_group_id=any(groups);
end; $$;

create function app_private.protect_adjusted_payout() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if old.transfer_group_id is not null and exists(
    select 1 from public.team_adjustment_settlements where transfer_group_id=old.transfer_group_id
  ) then
    if tg_op = 'DELETE' then raise exception 'Reopen this payout before deleting its work entries'; end if;
    if (new.amount_idr,new.team_member_id,new.transfer_group_id,new.status,new.date,new.paid_at,new.income_source_id)
      is distinct from (old.amount_idr,old.team_member_id,old.transfer_group_id,old.status,old.date,old.paid_at,old.income_source_id) then
      raise exception 'Reopen this payout before changing its work entries';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;
create trigger protect_adjusted_payout before update or delete on public.team_work_entries
  for each row execute function app_private.protect_adjusted_payout();

create function app_private.protect_shared_expense() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if (new.amount_idr,new.date,new.category_id,new.direction) is distinct from
     (old.amount_idr,old.date,old.category_id,old.direction)
     and exists(select 1 from public.team_payout_adjustments where expense_transaction_id=old.id) then
    raise exception 'Remove the linked payout adjustment before changing this shared expense';
  end if;
  return new;
end; $$;
create trigger protect_shared_expense before update on public.transactions
  for each row execute function app_private.protect_shared_expense();

revoke all on function public.manage_team_adjustment(text,uuid,uuid,date,numeric,text,uuid,uuid) from public,anon;
revoke all on function public.settle_team_payout(uuid[],date,text) from public,anon;
revoke all on function public.reopen_team_payouts(uuid,date) from public,anon;
grant execute on function public.manage_team_adjustment(text,uuid,uuid,date,numeric,text,uuid,uuid),
  public.settle_team_payout(uuid[],date,text),public.reopen_team_payouts(uuid,date) to authenticated;

-- Team earnings are already deducted from client income; cash transfers are not personal expenses.
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
  where t.source <> 'team_transfer'
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
