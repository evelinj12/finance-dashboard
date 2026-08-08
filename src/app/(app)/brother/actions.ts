"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const paymentStatuses = ["owed", "paid", "transferred", "unknown"] as const;

type ContractorPaymentStatus = (typeof paymentStatuses)[number];

function isPaymentStatus(value: string): value is ContractorPaymentStatus {
  return paymentStatuses.includes(value as ContractorPaymentStatus);
}

export interface ContractorPaymentInput {
  date: string;
  payee: string;
  amount: number;
  currency: string;
  fx_rate: number;
  amount_idr?: number;
  client_or_project: string | null;
  work_period: string | null;
  hours: number | null;
  status: ContractorPaymentStatus;
  paid_at: string | null;
  related_income_transaction_id: string | null;
  notes: string | null;
}

export async function addContractorPayment(input: ContractorPaymentInput) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }
  if (!Number.isFinite(input.fx_rate) || input.fx_rate <= 0) {
    throw new Error("FX rate must be greater than zero");
  }
  if (input.hours !== null && (!Number.isFinite(input.hours) || input.hours < 0)) {
    throw new Error("Hours must be zero or greater");
  }
  if (!isPaymentStatus(input.status)) {
    throw new Error("Invalid payment status");
  }

  const amountIdr = Math.round(input.amount * input.fx_rate);
  if (!Number.isFinite(amountIdr) || amountIdr <= 0) {
    throw new Error("Amount in IDR must be greater than zero");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contractor_payments").insert({
    ...input,
    amount_idr: amountIdr,
  });
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
