-- Finance Dashboard schema
-- Single-user app: RLS just requires an authenticated session, no per-row ownership needed.

create extension if not exists "pgcrypto";

-- ============================================================
-- Budget side: categories, budgets, sinking funds, transactions
-- ============================================================

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tag text not null check (tag in ('income', 'sinking_fund', 'fixed', 'spent')),
  notes text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table sinking_funds (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name text not null,
  monthly_amount numeric not null default 0,
  due_date date,
  rolling boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  month date not null, -- always first-of-month
  budget_amount numeric not null default 0,
  currency text not null default 'IDR',
  created_at timestamptz not null default now(),
  unique (category_id, month)
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  category_id uuid not null references categories(id) on delete restrict,
  direction text not null check (direction in ('in', 'out')),
  amount numeric not null,
  currency text not null default 'IDR',
  fx_rate numeric not null default 1,
  amount_idr numeric not null,
  notes text,
  save_to text, -- where a sinking fund contribution is parked (e.g. "pasar uang")
  source text not null default 'manual' check (source in ('manual', 'import')),
  created_at timestamptz not null default now()
);

create index transactions_date_idx on transactions (date);
create index transactions_category_idx on transactions (category_id);

-- ============================================================
-- Income side: freelance clients, digital products, other
-- ============================================================

create table income_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('freelance_client', 'digital_product', 'other')),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table income_transactions (
  id uuid primary key default gen_random_uuid(),
  income_source_id uuid not null references income_sources(id) on delete restrict,
  date date not null,
  description text,
  amount numeric not null,
  currency text not null default 'USD',
  fx_rate numeric not null default 1,
  amount_idr numeric not null,
  status text, -- e.g. SUCCESS, for imported digital product sales
  source text not null default 'manual' check (source in ('manual', 'import')),
  created_at timestamptz not null default now()
);

create index income_transactions_date_idx on income_transactions (date);
create index income_transactions_source_idx on income_transactions (income_source_id);

-- Payments to her brother for helping with client work.
-- No fixed formula -- logged case by case, optionally tied to the income it came from.
create table contractor_payments (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  payee text not null default 'Brother',
  amount numeric not null,
  currency text not null default 'IDR',
  fx_rate numeric not null default 1,
  amount_idr numeric not null,
  related_income_transaction_id uuid references income_transactions(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Net worth
-- ============================================================

create table net_worth_snapshots (
  id uuid primary key default gen_random_uuid(),
  month date not null unique, -- first-of-month
  cash numeric not null default 0,
  investments numeric not null default 0,
  retirement numeric not null default 0,
  personal numeric not null default 0,
  unsecured_liabilities numeric not null default 0,
  secured_liabilities numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  total_assets numeric generated always as (cash + investments + retirement + personal) stored,
  total_liabilities numeric generated always as (unsecured_liabilities + secured_liabilities) stored,
  net_worth numeric generated always as (
    (cash + investments + retirement + personal) - (unsecured_liabilities + secured_liabilities)
  ) stored
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('net_worth', 'income', 'savings')),
  year int not null,
  target_amount numeric not null,
  currency text not null default 'IDR',
  notes text,
  created_at timestamptz not null default now(),
  unique (type, year)
);

-- ============================================================
-- Row Level Security -- single user, any authenticated session
-- ============================================================

alter table categories enable row level security;
alter table sinking_funds enable row level security;
alter table budgets enable row level security;
alter table transactions enable row level security;
alter table income_sources enable row level security;
alter table income_transactions enable row level security;
alter table contractor_payments enable row level security;
alter table net_worth_snapshots enable row level security;
alter table goals enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'categories', 'sinking_funds', 'budgets', 'transactions',
    'income_sources', 'income_transactions', 'contractor_payments',
    'net_worth_snapshots', 'goals'
  ])
  loop
    execute format(
      'create policy "authenticated full access" on %I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')',
      t
    );
  end loop;
end $$;
