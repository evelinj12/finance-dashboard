"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { NetWorthCategoryGroup } from "@/lib/supabase/types";

export interface SnapshotInput {
  month: string;
  values: {
    category_id: string;
    amount_idr: number;
    notes: string | null;
  }[];
  notes: string | null;
}

export async function upsertSnapshot(input: SnapshotInput) {
  const supabase = await createClient();
  const categoryIds = input.values.map((value) => value.category_id);
  const { data: categories, error: categoriesError } =
    categoryIds.length > 0
      ? await supabase
          .from("net_worth_categories")
          .select("id, group_name, source_key")
          .in("id", categoryIds)
      : { data: [], error: null };
  if (categoriesError) throw new Error(categoriesError.message);

  const categoryById = new Map((categories ?? []).map((category) => [category.id, category]));
  const snapshotTotals = {
    cash: 0,
    investments: 0,
    retirement: 0,
    personal: 0,
    unsecured_liabilities: 0,
    secured_liabilities: 0,
  };

  for (const value of input.values) {
    const category = categoryById.get(value.category_id);
    if (!category) continue;

    const amount = Math.round(value.amount_idr);
    switch (category.source_key) {
      case "cash":
      case "investments":
      case "retirement":
      case "personal":
      case "unsecured_liabilities":
      case "secured_liabilities":
        snapshotTotals[category.source_key] += amount;
        break;
      default:
        if (category.group_name === "asset") snapshotTotals.personal += amount;
        if (category.group_name === "liability") snapshotTotals.unsecured_liabilities += amount;
    }
  }

  const { data: snapshot, error } = await supabase
    .from("net_worth_snapshots")
    .upsert(
      {
        month: input.month,
        ...snapshotTotals,
        notes: input.notes?.trim() || null,
        breakdown_quality: "full",
      },
      { onConflict: "month" },
    )
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const rows = input.values.map((value) => ({
    snapshot_id: snapshot.id,
    category_id: value.category_id,
    amount_idr: Math.round(value.amount_idr),
    notes: value.notes?.trim() || null,
  }));
  if (rows.length > 0) {
    const { error: valuesError } = await supabase
      .from("net_worth_category_values")
      .upsert(rows, { onConflict: "snapshot_id,category_id" });
    if (valuesError) throw new Error(valuesError.message);
  }

  revalidatePath("/networth");
  revalidatePath("/");
}

export async function deleteSnapshot(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("net_worth_snapshots").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/networth");
  revalidatePath("/");
}

export async function addNetWorthCategory(
  name: string,
  groupName: NetWorthCategoryGroup,
) {
  const supabase = await createClient();
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Category name is required");

  const { data: lastCategory } = await supabase
    .from("net_worth_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("net_worth_categories").insert({
    name: cleanName,
    group_name: groupName,
    sort_order: (lastCategory?.sort_order ?? 0) + 10,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/networth");
}

export async function updateNetWorthCategory(
  id: string,
  input: { name: string; group_name: NetWorthCategoryGroup; active: boolean },
) {
  const supabase = await createClient();
  const name = input.name.trim();
  if (!name) throw new Error("Category name is required");

  const { error } = await supabase
    .from("net_worth_categories")
    .update({
      name,
      group_name: input.group_name,
      active: input.active,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/networth");
}

export async function deleteNetWorthCategory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("net_worth_categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/networth");
}
