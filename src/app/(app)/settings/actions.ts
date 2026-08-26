"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CategoryTag, IncomeSourceType } from "@/lib/supabase/types";

const defaultNavOrder = [
  "overview",
  "budget",
  "saving-health",
  "transactions",
  "income",
  "team",
  "family",
  "networth",
  "exports",
  "settings",
];

const defaultNavIds = new Set(defaultNavOrder);
const nonHideableNavIds = new Set(["settings"]);

function revalidateNavPaths() {
  for (const path of [
    "/",
    "/budget",
    "/saving-health",
    "/transactions",
    "/income",
    "/team",
    "/family",
    "/networth",
    "/exports",
    "/settings",
  ]) {
    revalidatePath(path);
  }
}

function revalidateIncomeSourcePaths() {
  for (const path of ["/settings", "/income", "/team", "/exports", "/"]) {
    revalidatePath(path);
  }
}

export interface IncomeSourceInput {
  name: string;
  type: IncomeSourceType;
  notes: string | null;
  active: boolean;
  visible_in_active_breakdown: boolean;
}

function normalizeIncomeSourceInput(input: IncomeSourceInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Income source name is required");
  if (!["freelance_client", "digital_product", "other"].includes(input.type)) {
    throw new Error("Choose a valid source type");
  }

  return {
    name,
    type: input.type,
    notes: input.notes?.trim() || null,
    active: input.active,
    visible_in_active_breakdown: input.visible_in_active_breakdown,
  };
}

export async function addIncomeSourceSetting(input: IncomeSourceInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("income_sources").insert(normalizeIncomeSourceInput(input));
  if (error) throw new Error(error.message);
  revalidateIncomeSourcePaths();
}

export async function updateIncomeSource(id: string, input: IncomeSourceInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("income_sources").update(normalizeIncomeSourceInput(input)).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateIncomeSourcePaths();
}

export async function setIncomeSourceActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("income_sources").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateIncomeSourcePaths();
}

export async function deleteIncomeSource(id: string) {
  const supabase = await createClient();
  const [{ count: incomeCount, error: incomeError }, { count: teamCount, error: teamError }] = await Promise.all([
    supabase.from("income_transactions").select("id", { count: "exact", head: true }).eq("income_source_id", id),
    supabase.from("team_work_entries").select("id", { count: "exact", head: true }).eq("income_source_id", id),
  ]);

  if (incomeError) throw new Error(incomeError.message);
  if (teamError) throw new Error(teamError.message);
  if ((incomeCount ?? 0) + (teamCount ?? 0) > 0) {
    throw new Error("This source has income or Team entries. Deactivate it instead.");
  }

  const { error } = await supabase.from("income_sources").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateIncomeSourcePaths();
}

export async function addCategory(name: string, tag: CategoryTag) {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({ name, tag });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/budget");
  revalidatePath("/transactions");
}

export async function setCategoryActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/budget");
  revalidatePath("/transactions");
}

export interface SinkingFundInput {
  name: string;
  monthly_amount: number;
  due_date: string | null;
  rolling: boolean;
  notes: string | null;
}

function normalizeSinkingFundInput(input: SinkingFundInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Sinking fund name is required");
  if (!Number.isFinite(input.monthly_amount) || input.monthly_amount < 0) {
    throw new Error("Monthly amount must be zero or more");
  }

  return {
    name,
    monthly_amount: Math.round(input.monthly_amount),
    due_date: input.due_date || null,
    rolling: input.rolling,
    notes: input.notes?.trim() || null,
  };
}

export async function addSinkingFund(input: SinkingFundInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("sinking_funds").insert(normalizeSinkingFundInput(input));
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/budget");
  revalidatePath("/");
}

export async function updateSinkingFund(id: string, input: SinkingFundInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sinking_funds")
    .update(normalizeSinkingFundInput(input))
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/budget");
  revalidatePath("/");
}

export async function deleteSinkingFund(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("sinking_funds").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/budget");
  revalidatePath("/");
}

export interface FixedTransactionInput {
  category_id: string;
  name: string;
  monthly_amount: number;
  due_day: number;
  active: boolean;
  notes: string | null;
}

function normalizeFixedTransactionInput(input: FixedTransactionInput) {
  const categoryId = input.category_id.trim();
  const name = input.name.trim();
  const monthlyAmount = Number(input.monthly_amount);
  const dueDay = Number(input.due_day);

  if (!categoryId) throw new Error("Category is required");
  if (!name) throw new Error("Fixed transaction name is required");
  if (!Number.isFinite(monthlyAmount) || monthlyAmount < 0) {
    throw new Error("Monthly amount must be zero or more");
  }
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    throw new Error("Due day must be between 1 and 31");
  }

  return {
    category_id: categoryId,
    name,
    monthly_amount: Math.round(monthlyAmount),
    due_day: dueDay,
    active: input.active,
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };
}

export async function addFixedTransaction(input: FixedTransactionInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("fixed_transactions").insert(normalizeFixedTransactionInput(input));
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/budget");
  revalidatePath("/");
}

export async function updateFixedTransaction(id: string, input: FixedTransactionInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("fixed_transactions")
    .update(normalizeFixedTransactionInput(input))
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/budget");
  revalidatePath("/");
}

export async function deleteFixedTransaction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("fixed_transactions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/budget");
  revalidatePath("/");
}

export async function setNetWorthGoal(year: number, targetAmount: number) {
  if (!Number.isInteger(year) || year < 2025 || year > 2100) {
    throw new Error("Choose a valid goal year");
  }
  if (!Number.isFinite(targetAmount) || targetAmount < 0) {
    throw new Error("Goal amount must be zero or more");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("goals")
    .upsert({ type: "net_worth", year, target_amount: Math.round(targetAmount) }, { onConflict: "type,year" });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/networth");
}

export async function saveNavPreferences(order: string[], hidden: string[]) {
  const normalizedOrder = [...order, ...defaultNavOrder].filter((id, index, ids) => {
    return defaultNavIds.has(id) && ids.indexOf(id) === index;
  });
  const normalizedHidden = hidden.filter((id, index, ids) => {
    return defaultNavIds.has(id) && !nonHideableNavIds.has(id) && ids.indexOf(id) === index;
  });

  const supabase = await createClient();
  const { error } = await supabase.from("dashboard_preferences").upsert(
    {
      key: "nav",
      value: {
        order: normalizedOrder,
        hidden: normalizedHidden,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);
  revalidateNavPaths();
  return { order: normalizedOrder, hidden: normalizedHidden };
}

export async function resetNavPreferences() {
  const supabase = await createClient();
  const { error } = await supabase.from("dashboard_preferences").upsert(
    {
      key: "nav",
      value: {
        order: defaultNavOrder,
        hidden: [],
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);
  revalidateNavPaths();
  return { order: defaultNavOrder, hidden: [] };
}
