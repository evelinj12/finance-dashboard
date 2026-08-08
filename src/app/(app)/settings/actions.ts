"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CategoryTag } from "@/lib/supabase/types";

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

export async function addSinkingFund(input: SinkingFundInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("sinking_funds").insert(input);
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
