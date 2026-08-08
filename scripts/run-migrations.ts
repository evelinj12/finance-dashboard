// Runs the SQL files in supabase/migrations/ against DATABASE_URL, in order.
// Usage: DATABASE_URL=... npx tsx scripts/run-migrations.ts

import "dotenv/config";
import { Client } from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(__dirname, "..", "supabase", "migrations");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Set DATABASE_URL first.");
    process.exit(1);
  }

  const only = process.argv[2];
  let files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  if (only) files = files.filter((f) => f === only);
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    for (const file of files) {
      console.log(`Running ${file}...`);
      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
      await client.query(sql);
      console.log(`  done`);
    }
  } finally {
    await client.end();
  }
  console.log("All migrations applied.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
