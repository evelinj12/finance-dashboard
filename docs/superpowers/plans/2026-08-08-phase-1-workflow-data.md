# Finance Dashboard Phase 1 Workflow/Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dashboard usable as the daily source of truth for logging expenses, income, team work, net worth, and exports while correcting the saving health statuses and client/team net calculations.

**Architecture:** Add a Supabase schema layer for team members, team work entries, income time/status, net worth category values, and dashboard preferences. Build reusable server actions and inline quick-entry components on top of the existing Next.js App Router pages. Keep the current imported sheet data intact, add new views for corrected summaries, and move visible routes from Brother to Team with a redirect for the old path.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase Postgres, Server Actions, shadcn-style UI primitives, lucide-react, Recharts, node:test, ESLint, TypeScript compiler, Next build.

---

## Scope

This plan covers Phase 1 from `docs/superpowers/specs/2026-08-08-finance-dashboard-workflow-redesign.md`:

- Inline quick logging for transactions, income, and Team.
- Income status `waiting | paid` and total client time.
- Team page replacing Brother, seeded with Kevin, with member CRUD and owed/paid work entries.
- Gross client money/time minus Team money/time summary.
- Editable sinking funds.
- Saving Health `Unidentified` for months without enough imported data.
- Budget month-over-month ratio arrow.
- Net worth category-based submission and yearly labels on the trend.
- Export month filter.
- Navigation order/hide preferences.

The cozy visual refresh is intentionally left for a separate Phase 2 plan after this work is verified.

## Current File Map

- `src/components/nav.tsx`: hard-coded tab list, currently shows Brother.
- `src/app/(app)/transactions/page.tsx`: month picker, Add dialog, transactions table.
- `src/app/(app)/transactions/actions.ts`: add/update/delete transaction actions.
- `src/app/(app)/income/page.tsx`: month summary cards, Add source, Add income dialog, income table.
- `src/app/(app)/income/actions.ts`: income transaction/source actions.
- `src/app/(app)/brother/page.tsx`: existing contractor payments page.
- `src/app/(app)/brother/actions.ts`: contractor payment actions with extra statuses.
- `src/app/(app)/budget/page.tsx`: budget checker, saving health card, sinking fund read-only list.
- `src/app/(app)/budget/actions.ts`: budget upsert action.
- `src/app/(app)/saving-health/page.tsx`: historical saving health table.
- `src/app/(app)/networth/page.tsx`: snapshot list and chart using broad asset/liability columns.
- `src/app/(app)/networth/actions.ts`: snapshot CRUD.
- `src/app/(app)/settings/page.tsx`: Categories, Sinking Funds, Goals, Currency tabs.
- `src/app/(app)/settings/actions.ts`: category, sinking fund add/delete, net worth goal.
- `src/app/(app)/exports/page.tsx`: static CSV cards with no filters.
- `src/app/api/export/[dataset]/route.ts`: dataset CSV API.
- `src/lib/finance/monthly-summary.ts`: saving health math and status.
- `src/lib/finance/budget-summary.ts`: category actual/difference helpers.
- `src/lib/supabase/types.ts`: hand-written Supabase types.
- `supabase/migrations/0005_monthly_income_rollups.sql`: latest local schema change.

## Data Model

- Keep existing tables for backward compatibility.
- Add `team_members` and `team_work_entries`; copy existing `contractor_payments` into the new entries where possible.
- Keep `contractor_payments` available during rollout, but route new UI and exports through Team tables.
- Add income transaction fields for status and time. Existing `status` text can be normalized in place.
- Add net worth category tables so the new submission can mirror the sheet categories without losing old snapshot totals.
- Add dashboard preference rows for tab ordering/hiding.
- Add a new summary view instead of mutating `monthly_finance_summary_v2` in place.

## Tasks

- [ ] 1. Create Phase 1 database migration

  Add `supabase/migrations/0006_phase1_workflow_data.sql`.

  Include these schema changes:

  ```sql
  create table if not exists public.team_members (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    active boolean not null default true,
    default_currency text not null default 'IDR',
    notes text,
    created_at timestamptz not null default now()
  );

  insert into public.team_members (name, active, default_currency)
  values ('Kevin', true, 'IDR')
  on conflict (name) do update set active = true;

  create table if not exists public.team_work_entries (
    id uuid primary key default gen_random_uuid(),
    team_member_id uuid not null references public.team_members(id) on delete restrict,
    income_source_id uuid references public.income_sources(id) on delete set null,
    date date not null,
    description text,
    work_period text,
    hours numeric(10, 2),
    amount numeric(14, 2) not null,
    currency text not null default 'IDR',
    fx_rate numeric(14, 6) not null default 1,
    amount_idr numeric(14, 0) not null,
    status text not null default 'owed' check (status in ('owed', 'paid')),
    paid_at date,
    source_sheet text,
    source_row text,
    notes text,
    created_at timestamptz not null default now()
  );

  alter table public.income_transactions
    add column if not exists payment_status text not null default 'paid',
    add column if not exists total_hours numeric(10, 2);

  alter table public.income_transactions
    add constraint income_transactions_payment_status_check
    check (payment_status in ('waiting', 'paid'));
  ```

  Add a data migration that maps existing `contractor_payments.payee = 'Kevin'` rows to `team_work_entries`, using `client_or_project` to best-match `income_sources.name` where possible.

  Add preferences and net worth detail tables:

  ```sql
  create table if not exists public.dashboard_preferences (
    key text primary key,
    value jsonb not null,
    updated_at timestamptz not null default now()
  );

  create table if not exists public.net_worth_categories (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    group_name text not null check (group_name in ('asset', 'liability')),
    sort_order integer not null default 0,
    active boolean not null default true,
    source_key text,
    created_at timestamptz not null default now()
  );

  create table if not exists public.net_worth_category_values (
    id uuid primary key default gen_random_uuid(),
    snapshot_id uuid not null references public.net_worth_snapshots(id) on delete cascade,
    category_id uuid not null references public.net_worth_categories(id) on delete restrict,
    amount_idr numeric(14, 0) not null default 0,
    notes text,
    unique (snapshot_id, category_id)
  );
  ```

  Add RLS enablement and authenticated-user policies consistent with `0001_init.sql`.

  Seed default nav preference:

  ```sql
  insert into public.dashboard_preferences (key, value)
  values (
    'nav',
    '{"order":["overview","budget","saving-health","transactions","income","team","networth","exports","settings"],"hidden":[]}'::jsonb
  )
  on conflict (key) do nothing;
  ```

  Create `monthly_finance_summary_v3` with all `v2` columns plus:

  - `team_owed_idr`
  - `team_paid_idr`
  - `team_total_idr`
  - `has_expense_data`
  - `has_income_data`
  - `saving_health_identified`

  The view must deduct `team_total_idr` from visible client analysis, but saving health total income should continue to use `monthly_income_rollups` where present.

- [ ] 2. Update Supabase TypeScript types

  Edit `src/lib/supabase/types.ts` to add:

  ```ts
  export type IncomePaymentStatus = "waiting" | "paid";
  export type TeamWorkStatus = "owed" | "paid";
  export type NetWorthCategoryGroup = "asset" | "liability";
  ```

  Add `team_members`, `team_work_entries`, `dashboard_preferences`, `net_worth_categories`, and `net_worth_category_values` table types.

  Extend `income_transactions.Row` with:

  ```ts
  payment_status: IncomePaymentStatus;
  total_hours: number | null;
  ```

  Add `monthly_finance_summary_v3` view types. Keep `monthly_finance_summary_v2` types until every query has moved.

- [ ] 3. Add finance helper functions and tests

  Add `src/lib/finance/team-net.ts`:

  ```ts
  export interface ClientGrossInput {
    grossAmountIdr: number;
    grossHours: number;
    teamAmountIdr: number;
    teamHours: number;
  }

  export function calculateClientNet(input: ClientGrossInput) {
    return {
      netAmountIdr: input.grossAmountIdr - input.teamAmountIdr,
      netHours: Math.max(0, input.grossHours - input.teamHours),
    };
  }

  export function savingHealthDataStatus(input: {
    hasIncomeData: boolean;
    hasExpenseData: boolean;
  }): "identified" | "unidentified" {
    return input.hasIncomeData && input.hasExpenseData ? "identified" : "unidentified";
  }

  export function ratioTrend(currentRatio: number | null, previousRatio: number | null) {
    if (currentRatio === null || previousRatio === null) return "flat";
    if (currentRatio > previousRatio) return "up";
    if (currentRatio < previousRatio) return "down";
    return "flat";
  }
  ```

  Add `src/lib/finance/team-net.test.ts` for:

  - Team money is deducted from gross client money.
  - Team time is deducted from gross client time.
  - Time never displays below zero.
  - Missing month data returns `unidentified`.
  - Ratio trend returns `up`, `down`, and `flat`.

  Update `src/lib/finance/monthly-summary.ts` so `savingHealthStatus` can return `"Unidentified"` when passed an unidentified flag:

  ```ts
  export type SavingHealthStatus = "On target" | "Below target" | "Unidentified";
  ```

- [ ] 4. Replace Brother route with Team route

  Create `src/app/(app)/team/`.

  Move and refactor the Brother code into:

  - `src/app/(app)/team/page.tsx`
  - `src/app/(app)/team/actions.ts`
  - `src/app/(app)/team/team-work-quick-form.tsx`
  - `src/app/(app)/team/team-work-dialog.tsx`
  - `src/app/(app)/team/team-member-dialog.tsx`
  - `src/app/(app)/team/delete-team-work-button.tsx`
  - `src/app/(app)/team/delete-team-member-button.tsx`

  Server actions:

  ```ts
  const teamWorkStatuses = ["owed", "paid"] as const;

  export interface TeamWorkEntryInput {
    team_member_id: string;
    income_source_id: string | null;
    date: string;
    description: string | null;
    work_period: string | null;
    hours: number | null;
    amount: number;
    currency: string;
    fx_rate: number;
    status: TeamWorkStatus;
    paid_at: string | null;
    notes: string | null;
  }
  ```

  Requirements:

  - Page title is `Team`.
  - Kevin appears from `team_members` seed data.
  - Users can add/edit/delete team members. Delete should fail gracefully if the member has work entries; offer inactive toggle instead.
  - Users can add/edit/delete team work entries.
  - Work entry form includes member, client, date, description, optional work period, hours, amount, currency/FX, status owed/paid, paid date, notes.
  - Monthly cards show Owed, Paid, Team total, Team hours.
  - Client summary shows gross money/time, team money/time, user net money/time.

  Add `src/app/(app)/brother/page.tsx` redirect:

  ```ts
  import { redirect } from "next/navigation";

  export default function BrotherRedirect() {
    redirect("/team");
  }
  ```

- [ ] 5. Update navigation and preferences

  Update `src/components/nav.tsx`:

  - Replace Brother link with Team.
  - Support an ordered list and hidden list from `dashboard_preferences`.
  - Keep a default link map in code for first load.

  Because `Nav` is currently client-only, add a server wrapper:

  - `src/components/nav-shell.tsx` fetches preference value from Supabase.
  - `src/components/nav.tsx` renders ordered links.
  - `src/app/(app)/layout.tsx` uses `NavShell`.

  Add Settings tab:

  - `src/app/(app)/settings/nav-preferences-section.tsx`
  - `saveNavPreferences(order: string[], hidden: string[])`
  - `resetNavPreferences()`

  Initial implementation can use up/down buttons and hide toggles. Add drag handles only if the project already has a drag library or if native pointer handling is small enough to be tested quickly.

- [ ] 6. Add inline transaction quick form

  Create `src/app/(app)/transactions/transaction-quick-form.tsx`.

  Requirements:

  - Form sits directly below the page header.
  - Main fields are visible without clicking Add: date, category, amount, direction, notes, submit.
  - Advanced section is collapsible: currency, FX rate, save_to.
  - Uses existing `addTransaction`.
  - Resets after successful submit.
  - Keeps existing dialog for editing rows.

  Update `src/app/(app)/transactions/page.tsx` to render the quick form and change the button area to month controls only.

- [ ] 7. Add inline income quick form with waiting/paid and total time

  Update `src/app/(app)/income/actions.ts`:

  ```ts
  export interface IncomeTransactionInput {
    income_source_id: string;
    date: string;
    description: string | null;
    amount: number;
    currency: string;
    fx_rate: number;
    amount_idr: number;
    payment_status: IncomePaymentStatus;
    total_hours: number | null;
  }
  ```

  Create `src/app/(app)/income/income-quick-form.tsx`.

  Requirements:

  - Main fields visible: date, client/source, amount, status, total hours, description, submit.
  - Advanced section: currency, FX rate.
  - Status control offers only Waiting and Paid.
  - Table shows status and total hours.
  - Summary cards include waiting amount and paid amount for selected month.
  - Client summary deducts Team amount/hours using `calculateClientNet`.
  - Keep monthly rollup language visible so user understands saving health income still comes from the curated source rollup when available.

- [ ] 8. Make sinking funds editable

  Update `src/app/(app)/settings/actions.ts`:

  ```ts
  export async function updateSinkingFund(id: string, input: SinkingFundInput) {
    const supabase = await createClient();
    const { error } = await supabase.from("sinking_funds").update(input).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/settings");
    revalidatePath("/budget");
    revalidatePath("/");
  }
  ```

  Update `src/app/(app)/settings/sinking-funds-section.tsx`:

  - Add Edit button per row.
  - Reuse a single add/edit form component.
  - Preserve delete.

  Update `src/app/(app)/budget/page.tsx` sinking fund schedule to include an Edit link/button to Settings Sinking Funds, not inline editing inside Budget.

- [ ] 9. Fix Saving Health unidentified status and budget ratio trend

  Update all queries from `monthly_finance_summary_v2` to `monthly_finance_summary_v3` in:

  - `src/app/(app)/page.tsx`
  - `src/app/(app)/budget/page.tsx`
  - `src/app/(app)/saving-health/page.tsx`
  - `src/app/(app)/income/page.tsx`
  - `src/app/api/export/[dataset]/route.ts`

  Saving Health page:

  - If `saving_health_identified` is false, display `Unidentified`.
  - For unidentified months, ratio text is `-` and progress is muted/empty.
  - Do not label unidentified months as below target.

  Budget page:

  - Fetch current month and previous month summaries.
  - Compare ratios only when both are identified.
  - Use lucide `ArrowUpRight`, `ArrowDownRight`, or `Minus`.
  - Green arrow means current month ratio is higher than previous month.
  - Red arrow means current month ratio is lower than previous month.
  - Neutral dash means unchanged or comparison unavailable.

- [ ] 10. Add net worth category-based submission

  Before implementation, inspect the Google Sheet tab `gid=913692270` again using the connected Google Sheets tool and record category names in the implementation notes or migration seed. The categories must mirror the sheet names, not guessed labels.

  Update `src/app/(app)/networth/actions.ts` with:

  - `addNetWorthCategory`
  - `updateNetWorthCategory`
  - `setNetWorthCategoryActive`
  - `deleteNetWorthCategory` with safe failure if values exist
  - `upsertNetWorthSnapshotWithValues`

  Create/refactor:

  - `src/app/(app)/networth/net-worth-category-form.tsx`
  - `src/app/(app)/networth/snapshot-category-dialog.tsx`
  - `src/app/(app)/networth/net-worth-category-manager.tsx`

  Requirements:

  - Snapshot submission groups fields by Assets and Liabilities.
  - Users can add/edit/delete categories.
  - Snapshot totals come from category values when values exist.
  - Existing `net_worth_snapshots` totals continue to display for older imported rows that have no category values.
  - Latest breakdown shows category rows, not only broad Cash/Investments/Retirement/Personal.
  - Trend chart includes a visible yearly net worth number for each year with data.

- [ ] 11. Add export month filter

  Update `src/app/(app)/exports/page.tsx`:

  - Add `MonthPicker`.
  - Add `All months` option.
  - Build download URLs like `/api/export/income?month=2026-08-01`.

  Update `src/app/api/export/[dataset]/route.ts`:

  - Read `month` from `new URL(request.url).searchParams`.
  - For datasets with a date/month column, apply the filter.
  - For monthly summary, filter by `month`.
  - For lookup datasets without month data, ignore the filter and keep all rows.
  - Rename `kevin-payouts` export to `team-work`; keep `kevin-payouts` as an alias during rollout.

  Date filtering rules:

  ```ts
  const start = monthParam;
  const [startDate, endDate] = monthRange(monthParam);
  ```

  Use `gte("date", startDate).lt("date", endDate)` for daily tables and `.eq("month", start)` for monthly tables.

- [ ] 12. Update tests for changed behavior

  Add/update tests:

  - `src/lib/finance/monthly-summary.test.ts`: includes `Unidentified`.
  - `src/lib/finance/team-net.test.ts`: gross minus Team calculations.
  - `src/lib/finance/budget-summary.test.ts`: unchanged existing expectations still pass.

  If action validation is extracted into pure helper modules, add tests for:

  - Income status accepts waiting/paid only.
  - Team status accepts owed/paid only.
  - Team hours reject negative values.

- [ ] 13. Run local verification

  Use direct local Node binaries, because the package manager wrapper may require a TTY.

  ```bash
  /Users/evelin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test --import tsx "src/**/*.test.ts"
  /Users/evelin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/eslint/bin/eslint.js
  /Users/evelin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc --noEmit
  /Users/evelin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/next/dist/bin/next build --webpack
  git diff --check
  ```

- [ ] 14. Apply Supabase migration and verify live data

  Apply `0006_phase1_workflow_data.sql` to Supabase project `hbkulxttjuqkburpigis` using the connected Supabase tooling.

  Verify:

  ```sql
  select name, active from public.team_members order by name;
  select month, total_income_idr, team_total_idr, saving_health_identified
  from public.monthly_finance_summary_v3
  order by month desc
  limit 6;
  ```

  Confirm Kevin exists, active clients still exist, and current month has the correct identified/unidentified state.

- [ ] 15. Commit, push, deploy, and smoke test

  Commit with a message like:

  ```bash
  git add supabase/migrations/0006_phase1_workflow_data.sql src docs
  git commit -m "Add finance workflow data foundation"
  git push origin main
  ```

  Verify Vercel production deployment reaches READY.

  Smoke test these flows on production:

  - Transactions page can submit an expense from the quick form.
  - Income page can submit a waiting income row with hours.
  - Team page can submit Kevin owed work for a client with amount and hours.
  - Income client summary deducts Team amount and hours.
  - Saving Health old months without expense data show Unidentified.
  - Budget page ratio arrow appears when previous month data exists.
  - Sinking fund row can be edited.
  - Net worth snapshot can be entered with categories.
  - Export downloads respect selected month.
  - Nav can reorder/hide tabs and reset.

## Notes for Phase 2

After Phase 1 is deployed and the user confirms the workflows feel right, create a second plan for the Cozy Bento Ledger visual refresh:

- Softer color system with restrained pastel accents.
- Cute cat/money illustrations as small empty states or decorative corners, not core icons.
- Cleaner dashboard hierarchy and less plain table-only presentation.
- Consistent compact cards and charts across pages.
- Playwright screenshots across desktop and mobile before deployment.
