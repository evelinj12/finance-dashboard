"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface TransactionInput {
  date: string;
  category_id: string;
  direction: "in" | "out";
  amount: number;
  currency: string;
  fx_rate: number;
  amount_idr: number;
  notes: string | null;
  save_to: string | null;
}

export async function addTransaction(input: TransactionInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").insert(input);
  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
  revalidatePath("/budget");
  revalidatePath("/");
}

export async function updateTransaction(id: string, input: TransactionInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").update(input).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
  revalidatePath("/budget");
  revalidatePath("/");
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
  revalidatePath("/budget");
  revalidatePath("/");
}
