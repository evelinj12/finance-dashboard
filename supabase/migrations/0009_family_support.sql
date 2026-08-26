create table if not exists public.family_support_entries (
  id uuid primary key default gen_random_uuid(),
  month date not null,
  entry_date date,
  person text not null default 'Sister',
  direction text not null check (direction in ('add', 'deduct')),
  description text not null check (length(btrim(description)) > 0),
  amount numeric not null check (amount > 0),
  currency text not null default 'IDR',
  fx_rate numeric not null default 1 check (fx_rate > 0),
  amount_idr numeric not null check (amount_idr > 0),
  notes text,
  source_sheet text,
  source_row text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists family_support_entries_month_idx
  on public.family_support_entries (month desc, person, direction);

create table if not exists public.family_support_transfers (
  id uuid primary key default gen_random_uuid(),
  month date not null,
  person text not null default 'Sister',
  status text not null default 'not_transferred' check (status in ('not_transferred', 'transferred')),
  transferred_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month, person)
);

create index if not exists family_support_transfers_month_idx
  on public.family_support_transfers (month desc, person);

alter table public.family_support_entries enable row level security;
alter table public.family_support_transfers enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'family_support_entries',
    'family_support_transfers'
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
  public.family_support_entries,
  public.family_support_transfers
to authenticated;

insert into public.family_support_entries (
  month,
  entry_date,
  person,
  direction,
  description,
  amount,
  currency,
  fx_rate,
  amount_idr,
  notes,
  source_sheet,
  source_row
)
values
  ('2026-01-01', '2026-01-30', 'Sister', 'deduct', 'Wifi rusun', 332000, 'IDR', 1, 332000, null, 'Kath', 'January 2026'),
  ('2026-01-01', '2026-01-30', 'Sister', 'add', 'Petty cash', 500000, 'IDR', 1, 500000, null, 'Kath', 'January 2026'),
  ('2026-01-01', '2026-01-30', 'Sister', 'add', 'Apple One Dec', 100000, 'IDR', 1, 100000, null, 'Kath', 'January 2026'),
  ('2026-01-01', '2026-01-30', 'Sister', 'add', 'Apple One Jan', 100000, 'IDR', 1, 100000, null, 'Kath', 'January 2026'),
  ('2026-02-01', '2026-03-02', 'Sister', 'deduct', 'Wifi rusun', 332000, 'IDR', 1, 332000, null, 'Kath', 'February 2026'),
  ('2026-02-01', '2026-03-02', 'Sister', 'add', 'Petty cash', 500000, 'IDR', 1, 500000, null, 'Kath', 'February 2026'),
  ('2026-02-01', '2026-03-02', 'Sister', 'add', 'Apple One', 100000, 'IDR', 1, 100000, null, 'Kath', 'February 2026'),
  ('2026-03-01', '2026-04-01', 'Sister', 'deduct', 'Wifi rusun', 332000, 'IDR', 1, 332000, null, 'Kath', 'March 2026'),
  ('2026-03-01', '2026-04-01', 'Sister', 'add', 'Petty cash', 500000, 'IDR', 1, 500000, null, 'Kath', 'March 2026'),
  ('2026-03-01', '2026-04-01', 'Sister', 'add', 'Apple One', 100000, 'IDR', 1, 100000, null, 'Kath', 'March 2026'),
  ('2026-04-01', '2026-05-03', 'Sister', 'deduct', 'Wifi rusun', 332000, 'IDR', 1, 332000, null, 'Kath', 'April 2026'),
  ('2026-04-01', '2026-05-03', 'Sister', 'add', 'Petty cash', 500000, 'IDR', 1, 500000, null, 'Kath', 'April 2026'),
  ('2026-04-01', '2026-05-03', 'Sister', 'add', 'Apple One', 100000, 'IDR', 1, 100000, null, 'Kath', 'April 2026'),
  ('2026-05-01', '2026-06-01', 'Sister', 'deduct', 'Wifi rusun', 332000, 'IDR', 1, 332000, null, 'Kath', 'May 2026'),
  ('2026-05-01', '2026-06-01', 'Sister', 'add', 'Petty cash', 500000, 'IDR', 1, 500000, null, 'Kath', 'May 2026'),
  ('2026-05-01', '2026-06-01', 'Sister', 'add', 'Apple One', 100000, 'IDR', 1, 100000, null, 'Kath', 'May 2026'),
  ('2026-06-01', null, 'Sister', 'deduct', 'Wifi rusun', 332000, 'IDR', 1, 332000, null, 'Kath', 'June 2026'),
  ('2026-06-01', null, 'Sister', 'add', 'Petty cash', 500000, 'IDR', 1, 500000, null, 'Kath', 'June 2026'),
  ('2026-06-01', null, 'Sister', 'add', 'Apple One', 100000, 'IDR', 1, 100000, null, 'Kath', 'June 2026'),
  ('2026-07-01', '2026-08-03', 'Sister', 'deduct', 'Wifi rusun', 332000, 'IDR', 1, 332000, null, 'Kath', 'July 2026'),
  ('2026-07-01', '2026-08-03', 'Sister', 'add', 'Petty cash', 500000, 'IDR', 1, 500000, null, 'Kath', 'July 2026'),
  ('2026-07-01', '2026-08-03', 'Sister', 'add', 'Apple One', 100000, 'IDR', 1, 100000, null, 'Kath', 'July 2026');

insert into public.family_support_transfers (
  month,
  person,
  status,
  transferred_at,
  notes
)
values
  ('2026-01-01', 'Sister', 'transferred', '2026-01-30', 'Amount to send: IDR 368,000'),
  ('2026-02-01', 'Sister', 'transferred', '2026-03-02', 'Amount to send: IDR 268,000'),
  ('2026-03-01', 'Sister', 'transferred', '2026-04-01', 'Amount to send: IDR 268,000'),
  ('2026-04-01', 'Sister', 'transferred', '2026-05-03', 'Amount to send: IDR 268,000'),
  ('2026-05-01', 'Sister', 'transferred', '2026-06-01', 'Amount to send: IDR 268,000'),
  ('2026-06-01', 'Sister', 'not_transferred', null, 'Amount to send: IDR 268,000'),
  ('2026-07-01', 'Sister', 'transferred', '2026-08-03', 'Amount to send: IDR 268,000')
on conflict (month, person) do update set
  status = excluded.status,
  transferred_at = excluded.transferred_at,
  notes = excluded.notes,
  updated_at = now();

update public.dashboard_preferences as dp
set value = jsonb_set(
    dp.value,
    '{order}',
    (
      select jsonb_agg(id order by sort_key)
      from (
        select id, min(sort_key) as sort_key
        from (
          select
            nav_item.id,
            nav_item.ordinality * 10 as sort_key
          from jsonb_array_elements_text(dp.value->'order') with ordinality as nav_item(id, ordinality)
          union all
          select 'family', coalesce(
            (
              select team_item.ordinality * 10 + 1
              from jsonb_array_elements_text(dp.value->'order') with ordinality as team_item(id, ordinality)
              where team_item.id = 'team'
              limit 1
            ),
            61
          )
        ) ordered_ids
        group by id
      ) deduped
    )
  ),
  updated_at = now()
where key = 'nav'
  and not (dp.value->'order' ? 'family');
