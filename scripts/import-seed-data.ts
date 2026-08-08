// One-time historical data import, parsed from the user's original Google
// Sheets. Reads the JSON files in supabase/seed-data/ (already transformed
// into schema-shaped records) and loads them into Postgres directly.
//
//   DATABASE_URL=... npx tsx scripts/import-seed-data.ts
//
// Safe to re-run: net worth snapshots and budgets upsert on their unique
// keys; transactions and income are only inserted if empty for that source,
// to avoid duplicating rows on a second run.

import "dotenv/config";
import { Client } from "pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SEED_DIR = join(__dirname, "..", "supabase", "seed-data");

function loadJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(SEED_DIR, file), "utf-8"));
}

interface NetWorthRow {
  month: string;
  cash: number;
  investments: number;
  retirement: number;
  personal: number;
  unsecured_liabilities: number;
  secured_liabilities: number;
  notes: string;
}

interface ExpenseTxRow {
  date: string;
  category_name: string;
  tag: string;
  direction: "in" | "out";
  amount_idr: number;
  notes: string | null;
  save_to: string | null;
}

interface BudgetRow {
  month: string;
  category_name: string;
  tag: string;
  budget_amount: number;
}

interface FreelanceSourceRow {
  name: string;
  type: "freelance_client";
}

interface FreelanceIncomeRow {
  source_index: number;
  date: string;
  description: string;
  amount: number;
  currency: string;
  fx_rate: number;
  amount_idr: number;
  status: string | null;
}

interface DigitalProductRow {
  date: string;
  description: string;
  amount: number;
  currency: string;
  fx_rate: number;
  amount_idr: number;
  status: string;
}

async function importNetWorth(client: Client) {
  const rows = loadJson<NetWorthRow[]>("net_worth.json");
  for (const r of rows) {
    await client.query(
      `insert into net_worth_snapshots (month, cash, investments, retirement, personal, unsecured_liabilities, secured_liabilities, notes)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (month) do update set
         cash = excluded.cash, investments = excluded.investments, retirement = excluded.retirement,
         personal = excluded.personal, unsecured_liabilities = excluded.unsecured_liabilities,
         secured_liabilities = excluded.secured_liabilities, notes = excluded.notes`,
      [r.month, r.cash, r.investments, r.retirement, r.personal, r.unsecured_liabilities, r.secured_liabilities, r.notes]
    );
  }
  console.log(`net worth snapshots: upserted ${rows.length}`);
}

async function categoryIdMap(client: Client): Promise<Map<string, string>> {
  const { rows } = await client.query("select id, name, tag from categories");
  const map = new Map<string, string>();
  for (const c of rows) map.set(`${c.name}::${c.tag}`, c.id);
  return map;
}

async function importExpenseTransactions(client: Client, catMap: Map<string, string>) {
  const rows = loadJson<ExpenseTxRow[]>("expense_transactions.json");

  const { rows: countRows } = await client.query("select count(*) from transactions where source = 'import'");
  if (Number(countRows[0].count) > 0) {
    console.log(`expense transactions: ${countRows[0].count} already imported, skipping`);
    return;
  }

  let inserted = 0;
  for (const r of rows) {
    const category_id = catMap.get(`${r.category_name}::${r.tag}`);
    if (!category_id) {
      console.warn(`  no category match for "${r.category_name}" (${r.tag}), skipping row`);
      continue;
    }
    await client.query(
      `insert into transactions (date, category_id, direction, amount, currency, fx_rate, amount_idr, notes, save_to, source)
       values ($1, $2, $3, $4, 'IDR', 1, $5, $6, $7, 'import')`,
      [r.date, category_id, r.direction, r.amount_idr, r.amount_idr, r.notes, r.save_to]
    );
    inserted++;
  }
  console.log(`expense transactions: inserted ${inserted}`);
}

async function importBudgets(client: Client, catMap: Map<string, string>) {
  const rows = loadJson<BudgetRow[]>("expense_budgets.json");
  let upserted = 0;
  for (const r of rows) {
    const category_id = catMap.get(`${r.category_name}::${r.tag}`);
    if (!category_id) continue;
    await client.query(
      `insert into budgets (category_id, month, budget_amount)
       values ($1, $2, $3)
       on conflict (category_id, month) do update set budget_amount = excluded.budget_amount`,
      [category_id, r.month, r.budget_amount]
    );
    upserted++;
  }
  console.log(`budgets: upserted ${upserted}`);
}

async function importFreelanceIncome(client: Client) {
  const sources = loadJson<FreelanceSourceRow[]>("freelance_sources.json");
  const income = loadJson<FreelanceIncomeRow[]>("freelance_income.json");

  const { rows: existing } = await client.query("select id, name from income_sources where type = 'freelance_client'");
  const existingNames = new Set(existing.map((s) => s.name));

  for (const s of sources) {
    if (!existingNames.has(s.name)) {
      await client.query("insert into income_sources (name, type) values ($1, 'freelance_client')", [s.name]);
    }
  }

  const { rows: allSources } = await client.query("select id, name from income_sources where type = 'freelance_client'");
  const nameToId = new Map(allSources.map((s) => [s.name, s.id]));
  const indexToId = new Map(sources.map((s, i) => [i + 1, nameToId.get(s.name)]));

  let inserted = 0;
  for (const r of income) {
    const income_source_id = indexToId.get(r.source_index);
    if (!income_source_id) continue;
    await client.query(
      `insert into income_transactions (income_source_id, date, description, amount, currency, fx_rate, amount_idr, status, source)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'import')`,
      [income_source_id, r.date, r.description, r.amount, r.currency, r.fx_rate, r.amount_idr, r.status]
    );
    inserted++;
  }
  console.log(`freelance income: inserted ${inserted} across ${sources.length} clients`);
}

async function importDigitalProducts(client: Client) {
  const rows = loadJson<DigitalProductRow[]>("digital_products.json");

  const { rows: sourceRows } = await client.query("select id from income_sources where name = 'Digital Products'");
  if (sourceRows.length === 0) throw new Error("Digital Products income source not found -- run the base migrations first");
  const sourceId = sourceRows[0].id;

  let inserted = 0;
  for (const r of rows) {
    await client.query(
      `insert into income_transactions (income_source_id, date, description, amount, currency, fx_rate, amount_idr, status, source)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'import')`,
      [sourceId, r.date, r.description, r.amount, r.currency, r.fx_rate, r.amount_idr, r.status]
    );
    inserted++;
  }
  console.log(`digital product sales: inserted ${inserted}`);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Set DATABASE_URL first.");
    process.exit(1);
  }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    console.log("Importing historical data...\n");
    await importNetWorth(client);

    const catMap = await categoryIdMap(client);
    await importExpenseTransactions(client, catMap);
    await importBudgets(client, catMap);

    const { rows: countRows } = await client.query("select count(*) from income_transactions where source = 'import'");
    if (Number(countRows[0].count) > 0) {
      console.log(`income transactions: ${countRows[0].count} already imported, skipping (covers freelance + digital products)`);
    } else {
      await importFreelanceIncome(client);
      await importDigitalProducts(client);
    }

    console.log("\nDone.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
