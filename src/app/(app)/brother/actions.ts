"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ContractorPaymentInput {
  date: string;
  payee: string;
  amount: number;
  currency: string;
  fx_rate: number;
  amount_idr: number;
  related_income_transaction_id: string | null;
  notes: string | null;
}

export async function addContractorPayment(input: ContractorPaymentInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("contractor_payments").insert(input);
  if (error) throw new Error(error.message);
  revalidatePath("/brother");
  revalidatePath("/");
}

export async function deleteContractorPayment(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("contractor_payments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/brother");
  revalidatePath("/");
}
