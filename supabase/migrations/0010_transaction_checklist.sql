create table if not exists public.transaction_checklist_items (
  id uuid primary key default gen_random_uuid(),
  month date not null,
  title text not null check (length(btrim(title)) > 0),
  latest_date_note text,
  completed boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transaction_checklist_items_month_idx
  on public.transaction_checklist_items (month desc, completed, sort_order, title);

alter table public.transaction_checklist_items enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transaction_checklist_items'
      and policyname = 'authenticated full access'
  ) then
    create policy "authenticated full access"
      on public.transaction_checklist_items
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

grant select, insert, update, delete on table public.transaction_checklist_items to authenticated;

insert into public.transaction_checklist_items (month, title, latest_date_note, completed, sort_order)
values
  ('2026-08-01', 'IPL Apartment', '4 each month', true, 10),
  ('2026-08-01', 'Balifiber', null, true, 20),
  ('2026-08-01', 'Token Listrik', null, false, 30),
  ('2026-08-01', 'CC BCA', '10 each month', true, 40),
  ('2026-08-01', 'CC DBS', '6 each month', true, 50),
  ('2026-08-01', 'Parkir motor apart', '4 each month', true, 60)
on conflict do nothing;
