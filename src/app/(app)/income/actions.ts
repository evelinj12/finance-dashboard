"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface IncomeTransactionInput {
  income_source_id: string;
  date: string;
  description: string | null;
  amount: number;
  currency: string;
  fx_rate: number;
  amount_idr: number;
  status: string | null;
}

export async function addIncomeTransaction(input: IncomeTransactionInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("income_transactions").insert(input);
  if (error) throw new Error(error.message);
  revalidatePath("/income");
  revalidatePath("/");
}

export async function updateIncomeTransaction(id: string, input: IncomeTransactionInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("income_transactions").update(input).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/income");
  revalidatePath("/");
}

export async function deleteIncomeTransaction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("income_transactions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/income");
  revalidatePath("/");
}

export async function addIncomeSource(name: string, type: "freelance_client" | "digital_product" | "other") {
  const supabase = await createClient();
  const { data, error } = await supabase.from("income_sources").insert({ name, type }).select().single();
  if (error) throw new Error(error.message);
  revalidatePath("/income");
  return data;
}
