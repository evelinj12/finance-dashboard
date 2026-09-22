create table if not exists public.family_routine_entries (
  id uuid primary key default gen_random_uuid(),
  person text not null default 'Sister',
  direction text not null check (direction in ('add', 'deduct')),
  description text not null check (length(btrim(description)) > 0),
  monthly_amount numeric not null check (monthly_amount > 0),
  currency text not null default 'IDR',
  fx_rate numeric not null default 1 check (fx_rate > 0),
  amount_idr numeric not null check (amount_idr > 0),
  entry_day int not null default 1 check (entry_day between 1 and 31),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists family_routine_entries_active_idx
  on public.family_routine_entries (active, person, direction);

create table if not exists public.family_routine_entry_skips (
  id uuid primary key default gen_random_uuid(),
  routine_entry_id uuid not null references public.family_routine_entries(id) on delete cascade,
  month date not null,
  created_at timestamptz not null default now(),
  unique (routine_entry_id, month)
);

alter table public.family_support_entries
  add column if not exists routine_entry_id uuid references public.family_routine_entries(id) on delete set null,
  add column if not exists generated_month date;

create unique index if not exists family_support_entries_routine_generated_idx
  on public.family_support_entries (routine_entry_id, generated_month)
  where routine_entry_id is not null and generated_month is not null;

create index if not exists family_support_entries_routine_idx
  on public.family_support_entries (routine_entry_id, generated_month)
  where routine_entry_id is not null;

alter table public.family_routine_entries enable row level security;
alter table public.family_routine_entry_skips enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'family_routine_entries',
    'family_routine_entry_skips'
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
  public.family_routine_entries,
  public.family_routine_entry_skips
to authenticated;

insert into public.family_routine_entries (
  person,
  direction,
  description,
  monthly_amount,
  currency,
  fx_rate,
  amount_idr,
  entry_day,
  active,
  notes
)
select *
from (
  values
    ('Sister', 'add', 'petty cash + apple one', 600000, 'IDR', 1, 600000, 1, true, null),
    ('Sister', 'deduct', 'wifi rusun', 332000, 'IDR', 1, 332000, 1, true, null)
) as seed(person, direction, description, monthly_amount, currency, fx_rate, amount_idr, entry_day, active, notes)
where not exists (
  select 1
  from public.family_routine_entries existing
  where lower(existing.person) = lower(seed.person)
    and existing.direction = seed.direction
    and lower(existing.description) = lower(seed.description)
);
