alter table public.income_transactions
  add column if not exists transaction_posting_disabled boolean not null default false,
  add column if not exists transaction_posted_at timestamptz;

alter table public.team_work_entries
  add column if not exists transfer_group_id uuid;

alter table public.transactions
  add column if not exists generated_from text,
  add column if not exists source_income_transaction_id uuid,
  add column if not exists source_team_transfer_group_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_generated_from_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_generated_from_check
      check (generated_from is null or generated_from in ('income_transaction', 'team_transfer'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_source_income_transaction_id_fkey'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_source_income_transaction_id_fkey
      foreign key (source_income_transaction_id)
      references public.income_transactions(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_source_income_transaction_id_key'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_source_income_transaction_id_key unique (source_income_transaction_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_source_team_transfer_group_id_key'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_source_team_transfer_group_id_key unique (source_team_transfer_group_id);
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'transactions_source_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions drop constraint transactions_source_check;
  end if;
end $$;

alter table public.transactions
  add constraint transactions_source_check
  check (source in ('manual', 'import', 'auto_monthly', 'income_auto', 'team_transfer'));

create index if not exists transactions_source_income_transaction_idx
  on public.transactions (source_income_transaction_id)
  where source_income_transaction_id is not null;

create index if not exists transactions_source_team_transfer_idx
  on public.transactions (source_team_transfer_group_id)
  where source_team_transfer_group_id is not null;

create index if not exists team_work_entries_transfer_group_idx
  on public.team_work_entries (transfer_group_id)
  where transfer_group_id is not null;

insert into public.categories (name, tag, notes, active, sort_order, source_key)
select 'Team payout', 'spent', 'Team payments sent after client money is received.', true, 960, 'team_payout'
where not exists (
  select 1
  from public.categories
  where source_key = 'team_payout'
     or lower(name) = 'team payout'
);
