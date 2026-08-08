# Finance Dashboard

A private budget, income, and net worth dashboard, replacing four separate Google Sheets. Next.js + Supabase (Postgres + Auth), deployed on Vercel — all free tier.

## What's here

- `src/app/(app)/` — the app pages: Overview, Budget, Transactions, Income, Brother Payments, Net Worth, Saving Health, Exports, Settings
- `src/app/login/` — sign-in page (Supabase email/password auth, single user)
- `supabase/migrations/` — database schema and repair migrations, run in filename order
- `supabase/seed-data/` — historical data parsed from the original Google Sheets, ready to import
- `scripts/import-seed-data.ts` — one-time script that loads `supabase/seed-data/*.json` into Supabase

## First-time setup

### 1. Create free accounts

You'll need three free accounts — I can't create these for you:

1. **[Supabase](https://supabase.com)** — the database + auth. Free tier: 500MB storage, more than enough here.
2. **[GitHub](https://github.com)** — to hold the code so Vercel can deploy it.
3. **[Vercel](https://vercel.com)** — hosting. Free "Hobby" tier.

### 2. Create the Supabase project

1. In Supabase, create a new project (pick any region close to you).
2. Once it's up, copy the Supabase Postgres connection string from **Project Settings → Database**.
3. Run all SQL files in `supabase/migrations/` in filename order:
   ```bash
   DATABASE_URL="your-postgres-connection-string" npx tsx scripts/run-migrations.ts
   ```
   You can also paste each migration into the Supabase SQL Editor manually, as long as you run every file in order.
4. Go to **Authentication → Users** and manually add yourself as a user (email + password) — this is the one account the app will support signing in as.
5. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` `public` key

### 3. Configure environment variables

Create `.env.local` and fill in the Project URL and anon key:

```bash
NEXT_PUBLIC_SUPABASE_URL="your-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-public-key"
```

### 4. Run it locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the user you created in step 2.3.

### 5. Import historical data (optional, one-time)

`supabase/seed-data/` already contains your budget, income, and net worth history, parsed from the original sheets. To load it in:

```bash
DATABASE_URL="your-postgres-connection-string" npm run migrate
```

This is safe to re-run — it skips tables that already have imported rows.

**Known limitations of the import**, worth knowing about:
- The Google Sheets connector doesn't preserve every tab name, so older inactive freelance clients may still appear as "Client 1 (since Nov 2023)" style historical sources.
- The active-client breakdown is automatically limited to Agent EA, Erica - BCC, Jasper, JML Media, and Z PD. Older clients stay available in detailed exports but are hidden from the active-client view.
- Monthly income uses `monthly_income_rollups` when a row exists, seeded from `Income Record` → `All clients` → `Clients + Lynk`. Detailed `income_transactions` remain available for source-level analysis and downloads.
- Historical net worth snapshots (before May 2026) only have a total, not a cash/investments breakdown — they're filed under "investments" as a placeholder so the trend line stays accurate.
- Expense transactions don't have exact days in the source sheet (just a monthly log), so imported transactions are all dated the 1st of their month.
- The old "Potong/Tambah" petty-cash ledger (before your current Transaction Log system) wasn't imported — it was a narrow-scope reimbursement tracker, not full expense data, and is superseded by your current system anyway.

## Finance rules

- Saving health target is more than 50%.
- Saving health is calculated from savings covered by the month's income: `min(sinking funds + positive leftover net, income - true expenses) / total income`, floored at zero.
- Monthly income comes from the imported monthly rollup when available, then falls back to `income_transactions`.
- Detailed inactive-client rows stay exportable, while monthly dashboard income uses the curated rollup.
- Kevin payouts come from `Punya Kev` and can be marked owed, paid, transferred, or unknown.
- CSV exports are available from the Exports page for authenticated users.

## Deploying

1. Push this repo to a new GitHub repository.
2. In Vercel, "Add New Project" → import that repo.
3. Add the two `NEXT_PUBLIC_SUPABASE_*` environment variables from step 3 above in Vercel's project settings.
4. Deploy. You'll get a private URL — sign in with the same Supabase user.
