alter table public.transactions
  add column if not exists recurring_type text,
  add column if not exists recurring_template_id uuid,
  add column if not exists generated_month date;

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
  check (source in ('manual', 'import', 'auto_monthly'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_recurring_type_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_recurring_type_check
      check (recurring_type is null or recurring_type in ('sinking_fund', 'fixed_transaction'));
  end if;
end $$;

create index if not exists transactions_recurring_lookup_idx
  on public.transactions (generated_month, recurring_type, recurring_template_id)
  where recurring_type is not null;

create table if not exists public.fixed_transactions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  monthly_amount numeric not null default 0 check (monthly_amount >= 0),
  due_day int not null default 1 check (due_day between 1 and 31),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fixed_transactions_category_idx
  on public.fixed_transactions (category_id);

create table if not exists public.recurring_transaction_skips (
  id uuid primary key default gen_random_uuid(),
  recurring_type text not null check (recurring_type in ('sinking_fund', 'fixed_transaction')),
  recurring_template_id uuid not null,
  month date not null,
  created_at timestamptz not null default now(),
  unique (recurring_type, recurring_template_id, month)
);

alter table public.fixed_transactions enable row level security;
alter table public.recurring_transaction_skips enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'fixed_transactions',
    'recurring_transaction_skips'
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
  public.fixed_transactions,
  public.recurring_transaction_skips
to authenticated;

insert into public.fixed_transactions (category_id, name, monthly_amount, due_day, active, notes)
select
  c.id,
  coalesce(nullif(t.notes, ''), c.name),
  t.amount_idr,
  extract(day from t.date)::int,
  true,
  t.notes
from public.transactions t
join public.categories c on c.id = t.category_id
where c.tag = 'fixed'
  and t.direction = 'out'
  and t.amount_idr > 0
  and t.date >= date '2026-08-01'
  and t.date < date '2026-09-01'
  and not exists (
    select 1
    from public.fixed_transactions ft
    where ft.category_id = c.id
      and ft.monthly_amount = t.amount_idr
      and coalesce(ft.notes, '') = coalesce(t.notes, '')
  );
