create table if not exists public.sticky_notes (
  id uuid primary key default gen_random_uuid(),
  body text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sticky_notes_created_at_idx
  on public.sticky_notes (created_at desc);

alter table public.sticky_notes enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'sticky_notes'
      and policyname = 'authenticated full access'
  ) then
    create policy "authenticated full access"
      on public.sticky_notes
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

grant select, insert, update, delete on table public.sticky_notes to authenticated;
