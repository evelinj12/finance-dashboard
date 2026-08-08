import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/export/csv";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type CsvRow = Record<string, unknown>;
type DatasetQueryResult = {
  rows: CsvRow[] | null;
  error?: string;
};

function asCsvRows<T extends object>(rows: T[] | null) {
  return (rows ?? []).map((row) => ({ ...row }));
}

async function queryDataset(supabase: SupabaseClient, dataset: string): Promise<DatasetQueryResult> {
  switch (dataset) {
    case "expenses": {
      const { data, error } = await supabase.from("transactions").select("*").limit(10000);
      return error ? { rows: null, error: error.message } : { rows: asCsvRows(data) };
    }
    case "budgets": {
      const { data, error } = await supabase.from("budgets").select("*").limit(10000);
      return error ? { rows: null, error: error.message } : { rows: asCsvRows(data) };
    }
    case "income": {
      const { data, error } = await supabase.from("income_transactions").select("*").limit(10000);
      return error ? { rows: null, error: error.message } : { rows: asCsvRows(data) };
    }
    case "income-sources": {
      const { data, error } = await supabase.from("income_sources").select("*").limit(10000);
      return error ? { rows: null, error: error.message } : { rows: asCsvRows(data) };
    }
    case "kevin-payouts": {
      const { data, error } = await supabase.from("contractor_payments").select("*").limit(10000);
      return error ? { rows: null, error: error.message } : { rows: asCsvRows(data) };
    }
    case "net-worth": {
      const { data, error } = await supabase.from("net_worth_snapshots").select("*").limit(10000);
      return error ? { rows: null, error: error.message } : { rows: asCsvRows(data) };
    }
    case "goals": {
      const { data, error } = await supabase.from("goals").select("*").limit(10000);
      return error ? { rows: null, error: error.message } : { rows: asCsvRows(data) };
    }
    case "monthly-summary": {
      const { data, error } = await supabase.from("monthly_finance_summary_v2").select("*").limit(10000);
      return error ? { rows: null, error: error.message } : { rows: asCsvRows(data) };
    }
    default:
      return { rows: null };
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dataset: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dataset } = await params;
  const { rows, error } = await queryDataset(supabase, dataset);

  if (error) {
    return Response.json({ error }, { status: 500 });
  }

  if (!rows) {
    return Response.json({ error: "Export not found" }, { status: 404 });
  }

  return new Response(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${dataset}.csv"`,
    },
  });
}
