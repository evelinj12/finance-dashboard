"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CategoryTag } from "@/lib/supabase/types";

const defaultNavOrder = [
  "overview",
  "budget",
  "saving-health",
  "transactions",
  "income",
  "team",
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
    "/networth",
    "/exports",
    "/settings",
  ]) {
    revalidatePath(path);
  }
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

export async function setNetWorthGoal(year: number, targetAmount: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("goals")
    .upsert({ type: "net_worth", year, target_amount: targetAmount }, { onConflict: "type,year" });
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
