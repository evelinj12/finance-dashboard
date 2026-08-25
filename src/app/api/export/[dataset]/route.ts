import { createClient } from "@/lib/supabase/server";
import { monthRange } from "@/lib/dates";
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

async function queryDataset(
  supabase: SupabaseClient,
  dataset: string,
  month?: string,
): Promise<DatasetQueryResult> {
  const [start, end] = month ? monthRange(month) : [null, null];

  switch (dataset) {
    case "expenses": {
      let query = supabase.from("transactions").select("*").limit(10000);
      if (start && end) query = query.gte("date", start).lt("date", end);
      const { data, error } = await query;
      return error ? { rows: null, error: error.message } : { rows: asCsvRows(data) };
    }
    case "budgets": {
      let query = supabase.from("budgets").select("*").limit(10000);
      if (month) query = query.eq("month", month);
      const { data, error } = await query;
      return error ? { rows: null, error: error.message } : { rows: asCsvRows(data) };
    }
    case "income": {
      let query = supabase.from("income_transactions").select("*").limit(10000);
      if (start && end) query = query.gte("date", start).lt("date", end);
      const { data, error } = await query;
      return error ? { rows: null, error: error.message } : { rows: asCsvRows(data) };
    }
    case "income-sources": {
      const { data, error } = await supabase.from("income_sources").select("*").limit(10000);
      return error ? { rows: null, error: error.message } : { rows: asCsvRows(data) };
    }
    case "team-work": {
      let query = supabase.from("team_work_entries").select("*").limit(10000);
      if (start && end) query = query.gte("date", start).lt("date", end);
      const { data, error } = await query;
      return error ? { rows: null, error: error.message } : { rows: asCsvRows(data) };
    }
    case "team-members": {
      const { data, error } = await supabase.from("team_members").select("*").limit(10000);
      return error ? { rows: null, error: error.message } : { rows: asCsvRows(data) };
    }
    case "kevin-payouts": {
      let query = supabase.from("contractor_payments").select("*").limit(10000);
      if (start && end) query = query.gte("date", start).lt("date", end);
      const { data, error } = await query;
      return error ? { rows: null, error: error.message } : { rows: asCsvRows(data) };
    }
    case "net-worth": {
      let query = supabase.from("net_worth_snapshots").select("*").limit(10000);
      if (month) query = query.eq("month", month);
      const { data, error } = await query;
      return error ? { rows: null, error: error.message } : { rows: asCsvRows(data) };
    }
    case "goals": {
      const { data, error } = await supabase.from("goals").select("*").limit(10000);
      return error ? { rows: null, error: error.message } : { rows: asCsvRows(data) };
    }
    case "monthly-summary": {
      let query = supabase.from("monthly_finance_summary_v3").select("*").limit(10000);
      if (month) query = query.eq("month", month);
      const { data, error } = await query;
      return error ? { rows: null, error: error.message } : { rows: asCsvRows(data) };
    }
    default:
      return { rows: null };
  }
}

export async function GET(
  request: Request,
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
  const monthParam = new URL(request.url).searchParams.get("month");
  if (monthParam && !/^\d{4}-\d{2}-01$/.test(monthParam)) {
    return Response.json({ error: "Month must use YYYY-MM-01 format" }, { status: 400 });
  }
  const { rows, error } = await queryDataset(supabase, dataset, monthParam ?? undefined);

  if (error) {
    return Response.json({ error }, { status: 500 });
  }

  if (!rows) {
    return Response.json({ error: "Export not found" }, { status: 404 });
  }

  return new Response(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${dataset}${monthParam ? `-${monthParam.slice(0, 7)}` : ""}.csv"`,
    },
  });
}
