# Finance Dashboard

A private budget, income, and net worth dashboard, replacing four separate Google Sheets. Next.js + Supabase (Postgres + Auth), deployed on Vercel — all free tier.

## What's here

- `src/app/(app)/` — the seven pages: Overview, Budget, Transactions, Income, Brother Payments, Net Worth, Settings
- `src/app/login/` — sign-in page (Supabase email/password auth, single user)
- `supabase/migrations/` — database schema (`0001_init.sql`) and category/sinking-fund seed data (`0002_seed_categories.sql`)
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
2. Once it's up, go to **SQL Editor** and run the contents of `supabase/migrations/0001_init.sql`, then `0002_seed_categories.sql`, in that order.
3. Go to **Authentication → Users** and manually add yourself as a user (email + password) — this is the one account the app will support signing in as.
4. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` `public` key
   - `service_role` key (only needed for the one-time data import below — keep this one secret, never put it in the app itself)

### 3. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in the Project URL and anon key:

```bash
cp .env.local.example .env.local
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
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key npm run migrate
```

This is safe to re-run — it skips tables that already have imported rows.

**Known limitations of the import**, worth knowing about:
- The Google Sheets connector doesn't preserve tab names, so your 13 freelance clients were imported as "Client 1 (since Nov 2023)" through "Client 13" — rename them to real names in the Income page once you're in.
- Historical net worth snapshots (before May 2026) only have a total, not a cash/investments breakdown — they're filed under "investments" as a placeholder so the trend line stays accurate.
- Expense transactions don't have exact days in the source sheet (just a monthly log), so imported transactions are all dated the 1st of their month.
- The old "Potong/Tambah" petty-cash ledger (before your current Transaction Log system) wasn't imported — it was a narrow-scope reimbursement tracker, not full expense data, and is superseded by your current system anyway.

## Deploying

1. Push this repo to a new GitHub repository.
2. In Vercel, "Add New Project" → import that repo.
3. Add the two `NEXT_PUBLIC_SUPABASE_*` environment variables from step 3 above in Vercel's project settings.
4. Deploy. You'll get a private URL — sign in with the same Supabase user.
