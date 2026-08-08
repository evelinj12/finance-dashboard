// One-time historical data import, parsed from the user's original Google
// Sheets. Reads the JSON files in supabase/seed-data/ (already transformed
// into schema-shaped records) and loads them into Supabase.
//
// Requires a service role key (bypasses RLS) since this runs outside a
// logged-in session:
//   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... npx tsx scripts/import-seed-data.ts
//
// Safe to re-run: net worth snapshots and budgets upsert on their unique
// keys; transactions and income are only inserted if the table is empty
// for that source, to avoid duplicating rows on a second run.

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SEED_DIR = join(__dirname, "..", "supabase", "seed-data");

function loadJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(SEED_DIR, file), "utf-8"));
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

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

async function importNetWorth() {
  const rows = loadJson<NetWorthRow[]>("net_worth.json");
  const { error } = await supabase.from("net_worth_snapshots").upsert(rows, { onConflict: "month" });
  if (error) throw new Error(`net worth: ${error.message}`);
  console.log(`net worth snapshots: upserted ${rows.length}`);
}

async function categoryIdMap(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from("categories").select("id, name, tag");
  if (error) throw new Error(`categories: ${error.message}`);
  const map = new Map<string, string>();
  for (const c of data ?? []) map.set(`${c.name}::${c.tag}`, c.id);
  return map;
}

async function importExpenseTransactions(catMap: Map<string, string>) {
  const rows = loadJson<ExpenseTxRow[]>("expense_transactions.json");

  const { count } = await supabase.from("transactions").select("id", { count: "exact", head: true }).eq("source", "import");
  if (count && count > 0) {
    console.log(`expense transactions: ${count} already imported, skipping`);
    return;
  }

  const payload = rows
    .map((r) => {
      const category_id = catMap.get(`${r.category_name}::${r.tag}`);
      if (!category_id) {
        console.warn(`  no category match for "${r.category_name}" (${r.tag}), skipping row`);
        return null;
      }
      return {
        date: r.date,
        category_id,
        direction: r.direction,
        amount: r.amount_idr,
        currency: "IDR",
        fx_rate: 1,
        amount_idr: r.amount_idr,
        notes: r.notes,
        save_to: r.save_to,
        source: "import" as const,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const { error } = await supabase.from("transactions").insert(payload);
  if (error) throw new Error(`expense transactions: ${error.message}`);
  console.log(`expense transactions: inserted ${payload.length}`);
}

async function importBudgets(catMap: Map<string, string>) {
  const rows = loadJson<BudgetRow[]>("expense_budgets.json");
  const payload = rows
    .map((r) => {
      const category_id = catMap.get(`${r.category_name}::${r.tag}`);
      if (!category_id) return null;
      return { category_id, month: r.month, budget_amount: r.budget_amount };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const { error } = await supabase.from("budgets").upsert(payload, { onConflict: "category_id,month" });
  if (error) throw new Error(`budgets: ${error.message}`);
  console.log(`budgets: upserted ${payload.length}`);
}

async function importFreelanceIncome() {
  const sources = loadJson<FreelanceSourceRow[]>("freelance_sources.json");
  const income = loadJson<FreelanceIncomeRow[]>("freelance_income.json");

  const { data: existing } = await supabase
    .from("income_sources")
    .select("id, name")
    .eq("type", "freelance_client");
  const existingNames = new Set((existing ?? []).map((s) => s.name));

  const toInsert = sources.filter((s) => !existingNames.has(s.name));
  if (toInsert.length > 0) {
    const { error } = await supabase.from("income_sources").insert(toInsert);
    if (error) throw new Error(`freelance sources: ${error.message}`);
  }

  const { data: allSources, error: fetchErr } = await supabase
    .from("income_sources")
    .select("id, name")
    .eq("type", "freelance_client");
  if (fetchErr) throw new Error(`freelance sources fetch: ${fetchErr.message}`);
  const nameToId = new Map((allSources ?? []).map((s) => [s.name, s.id]));
  // sources.json is in the same order as source_index 1..N
  const indexToId = new Map(sources.map((s, i) => [i + 1, nameToId.get(s.name)]));

  const payload = income
    .map((r) => {
      const income_source_id = indexToId.get(r.source_index);
      if (!income_source_id) return null;
      return {
        income_source_id,
        date: r.date,
        description: r.description,
        amount: r.amount,
        currency: r.currency,
        fx_rate: r.fx_rate,
        amount_idr: r.amount_idr,
        status: r.status,
        source: "import" as const,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const { error } = await supabase.from("income_transactions").insert(payload);
  if (error) throw new Error(`freelance income: ${error.message}`);
  console.log(`freelance income: inserted ${payload.length} across ${sources.length} clients`);
}

async function importDigitalProducts() {
  const rows = loadJson<DigitalProductRow[]>("digital_products.json");

  const { data: source, error: sourceErr } = await supabase
    .from("income_sources")
    .select("id")
    .eq("name", "Digital Products")
    .single();
  if (sourceErr || !source) throw new Error("Digital Products income source not found -- run the base migrations first");

  const payload = rows.map((r) => ({
    income_source_id: source.id,
    date: r.date,
    description: r.description,
    amount: r.amount,
    currency: r.currency,
    fx_rate: r.fx_rate,
    amount_idr: r.amount_idr,
    status: r.status,
    source: "import" as const,
  }));

  // chunk to stay under request size limits
  const chunkSize = 500;
  let inserted = 0;
  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize);
    const { error } = await supabase.from("income_transactions").insert(chunk);
    if (error) throw new Error(`digital products (chunk ${i}): ${error.message}`);
    inserted += chunk.length;
  }
  console.log(`digital product sales: inserted ${inserted}`);
}

async function main() {
  console.log("Importing historical data...\n");
  await importNetWorth();

  const catMap = await categoryIdMap();
  await importExpenseTransactions(catMap);
  await importBudgets(catMap);

  const { count } = await supabase
    .from("income_transactions")
    .select("id", { count: "exact", head: true })
    .eq("source", "import");
  if (count && count > 0) {
    console.log(`income transactions: ${count} already imported, skipping (covers freelance + digital products)`);
  } else {
    await importFreelanceIncome();
    await importDigitalProducts();
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
