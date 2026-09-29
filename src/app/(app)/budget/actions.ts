"use server";

import { revalidatePath } from "next/cache";
import { monthStart } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_BUDGET_MONTH = "1900-01-01";

function isMonthString(value: string) {
  return /^\d{4}-\d{2}-01$/.test(value);
}

function revalidateBudgetPaths() {
  revalidatePath("/budget");
  revalidatePath("/settings");
  revalidatePath("/");
}

export async function ensureMonthlyBudgets(month: string) {
  if (!isMonthString(month) || month === DEFAULT_BUDGET_MONTH) {
    return { created: 0, source: "none" as const };
  }

  const supabase = await createClient();
  const { count: currentCount, error: currentError } = await supabase
    .from("budgets")
    .select("id", { count: "exact", head: true })
    .eq("month", month);

  if (currentError) throw new Error(currentError.message);
  if ((currentCount ?? 0) > 0) return { created: 0, source: "existing" as const };

  const { data: defaultBudgets, error: defaultsError } = await supabase
    .from("budgets")
    .select("category_id, budget_amount, currency")
    .eq("month", DEFAULT_BUDGET_MONTH);

  if (defaultsError) throw new Error(defaultsError.message);

  let source: "defaults" | "previous" | "none" = "defaults";
  let sourceRows = defaultBudgets ?? [];

  if (sourceRows.length === 0) {
    source = "previous";
    const { data: previousMonth, error: previousMonthError } = await supabase
      .from("budgets")
      .select("month")
      .lt("month", month)
      .neq("month", DEFAULT_BUDGET_MONTH)
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previousMonthError) throw new Error(previousMonthError.message);

    if (previousMonth?.month) {
      const { data: previousBudgets, error: previousBudgetsError } = await supabase
        .from("budgets")
        .select("category_id, budget_amount, currency")
        .eq("month", previousMonth.month);

      if (previousBudgetsError) throw new Error(previousBudgetsError.message);
      sourceRows = previousBudgets ?? [];
    }
  }

  if (sourceRows.length === 0) return { created: 0, source: "none" as const };

  const rows = sourceRows.map((row) => ({
    category_id: row.category_id,
    month,
    budget_amount: row.budget_amount,
    currency: row.currency ?? "IDR",
  }));

  const { error } = await supabase.from("budgets").upsert(rows, { onConflict: "category_id,month" });
  if (error) throw new Error(error.message);

  return { created: rows.length, source };
}

export async function setBudgets(
  month: string,
  entries: { category_id: string; budget_amount: number }[]
) {
  const supabase = await createClient();
  const rows = entries.map((e) => ({ ...e, month }));
  const { error } = await supabase.from("budgets").upsert(rows, { onConflict: "category_id,month" });
  if (error) throw new Error(error.message);
  revalidateBudgetPaths();
}

export async function setBudgetDefaults(entries: { category_id: string; budget_amount: number }[]) {
  const supabase = await createClient();
  const currentMonth = monthStart();
  const rows = entries.flatMap((entry) =>
    [DEFAULT_BUDGET_MONTH, currentMonth].map((month) => ({
      category_id: entry.category_id,
      month,
      budget_amount: Math.round(Number(entry.budget_amount) || 0),
      currency: "IDR",
    }))
  );
  const { error } = await supabase.from("budgets").upsert(rows, { onConflict: "category_id,month" });
  if (error) throw new Error(error.message);
  revalidateBudgetPaths();
}

export async function deleteBudgetDefault(categoryId: string) {
  const normalizedCategoryId = categoryId.trim();
  if (!normalizedCategoryId) throw new Error("Category is required");

  const supabase = await createClient();
  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("category_id", normalizedCategoryId)
    .in("month", [DEFAULT_BUDGET_MONTH, monthStart()]);

  if (error) throw new Error(error.message);
  revalidateBudgetPaths();
}
