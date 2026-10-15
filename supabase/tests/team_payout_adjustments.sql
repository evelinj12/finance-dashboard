-- Run in a disposable database with the payout-adjustment migration applied.
begin;
do $$
declare
  member uuid := gen_random_uuid();
  client uuid := gen_random_uuid();
  category uuid := gen_random_uuid();
  expense uuid := gen_random_uuid();
  adjustment uuid := gen_random_uuid();
  entry1 uuid := gen_random_uuid();
  entry2 uuid := gen_random_uuid();
  payout uuid;
  repayment_request uuid := gen_random_uuid();
  before_income numeric;
  after_income numeric;
begin
  insert into public.team_members(id,name) values(member,'Adjustment test');
  insert into public.income_sources(id,name,type) values(client,'Test client','freelance_client');
  insert into public.categories(id,name,tag) values(category,'Gift test','spent');
  insert into public.transactions(id,date,category_id,direction,amount,currency,fx_rate,amount_idr,source)
    values(expense,'2099-01-01',category,'out',600000,'IDR',1,600000,'manual');
  insert into public.income_transactions(income_source_id,date,amount_idr)
    values(client,'2099-01-01',2000000);
  insert into public.team_work_entries(id,team_member_id,income_source_id,date,amount,amount_idr,hours,status)
    values(entry1,member,client,'2099-01-01',200000,200000,1,'owed'),
      (entry2,member,client,'2099-02-01',500000,500000,2,'owed');
  select total_income_idr into before_income from public.monthly_finance_summary_v3 where month='2099-01-01';

  perform public.manage_team_adjustment('add',adjustment,member,'2099-01-01',300000,'Shared gift',expense);
  if (select true_expenses_idr from public.monthly_finance_summary_v3 where month='2099-01-01') <> 300000 then
    raise exception 'Gift share was not excluded from personal expenses';
  end if;
  begin
    perform public.manage_team_adjustment('add',gen_random_uuid(),member,'2099-01-01',400000,'Oversized share',expense);
    raise exception 'Expected excessive share to fail';
  exception when others then
    if sqlerrm = 'Expected excessive share to fail' then raise; end if;
  end;
  perform public.manage_team_adjustment('repay',adjustment,member,'2099-01-02',50000,'',null,repayment_request);
  perform public.manage_team_adjustment('repay',adjustment,member,'2099-01-02',50000,'',null,repayment_request);
  payout := public.settle_team_payout(array[entry1],'2099-01-03',null);
  if (select amount_idr from public.transactions where source_team_transfer_group_id=payout) <> 0 then
    raise exception 'Fully offset payout must have zero cash transfer';
  end if;
  if (select sum(amount_idr) from public.team_adjustment_settlements where adjustment_id=adjustment) <> 250000 then
    raise exception 'Partial repayment and payout deductions are incorrect';
  end if;
  select total_income_idr into after_income from public.monthly_finance_summary_v3 where month='2099-01-01';
  if before_income <> after_income then raise exception 'Adjustment changed personal client income'; end if;
  begin
    perform public.settle_team_payout(array[entry1],'2099-01-03',null);
    raise exception 'Expected duplicate payout to fail';
  exception when others then
    if sqlerrm = 'Expected duplicate payout to fail' then raise; end if;
  end;
  begin
    delete from public.team_work_entries where id=entry1;
    raise exception 'Expected settled work deletion to fail';
  exception when others then
    if sqlerrm = 'Expected settled work deletion to fail' then raise; end if;
  end;
  perform public.reopen_team_payouts(member,'2099-01-01');
  if (select sum(amount_idr) from public.team_adjustment_settlements where adjustment_id=adjustment) <> 50000 then
    raise exception 'Reopening must release only payout deductions';
  end if;
  payout := public.settle_team_payout(array[entry2],'2099-02-03',null);
  if (select amount_idr from public.transactions where source_team_transfer_group_id=payout) <> 250000 then
    raise exception 'Carryover deduction was not applied to February';
  end if;
  if (select sum(amount_idr) from public.team_adjustment_settlements where adjustment_id=adjustment) <> 300000 then
    raise exception 'Carryover adjustment did not settle in full';
  end if;
  if (select true_expenses_idr from public.monthly_finance_summary_v3 where month='2099-02-01') <> 0 then
    raise exception 'Team cash transfer counted as personal spending';
  end if;
  begin
    perform public.manage_team_adjustment('repay',adjustment,member,'2099-02-04',1,'',null);
    raise exception 'Expected overpayment to fail';
  exception when others then
    if sqlerrm = 'Expected overpayment to fail' then raise; end if;
  end;
end $$;
rollback;
