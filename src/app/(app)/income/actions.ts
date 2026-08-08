"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { IncomePaymentStatus } from "@/lib/supabase/types";

export interface IncomeTransactionInput {
  income_source_id: string;
  date: string;
  description: string | null;
  amount: number;
  currency: string;
  fx_rate: number;
  amount_idr: number;
  payment_status: IncomePaymentStatus;
  total_hours: number | null;
}

function isIncomePaymentStatus(value: unknown): value is IncomePaymentStatus {
  return value === "waiting" || value === "paid";
}

function normalizeIncomeTransactionInput(input: IncomeTransactionInput): IncomeTransactionInput {
  const incomeSourceId = input.income_source_id?.trim();
  const date = input.date?.trim();
  const currency = input.currency?.trim() || "IDR";
  const amount = Number(input.amount);
  const fxRate = Number(input.fx_rate);
  const totalHours = input.total_hours === null ? null : Number(input.total_hours);

  if (!incomeSourceId) {
    throw new Error("Income source is required");
  }
  if (!date) {
    throw new Error("Date is required");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }
  if (!Number.isFinite(fxRate) || fxRate <= 0) {
    throw new Error("FX rate must be greater than 0");
  }
  if (totalHours !== null && (!Number.isFinite(totalHours) || totalHours < 0)) {
    throw new Error("Total hours must be 0 or greater");
  }
  if (!isIncomePaymentStatus(input.payment_status)) {
    throw new Error("Invalid income payment status");
  }

  const description = input.description?.trim() || null;

  return {
    ...input,
    income_source_id: incomeSourceId,
    date,
    description,
    amount,
    currency,
    fx_rate: fxRate,
    amount_idr: Math.round(amount * fxRate),
    payment_status: input.payment_status,
    total_hours: totalHours,
  };
}

function revalidateIncomePaths() {
  revalidatePath("/income");
  revalidatePath("/team");
  revalidatePath("/");
}

export async function addIncomeTransaction(input: IncomeTransactionInput) {
  const normalizedInput = normalizeIncomeTransactionInput(input);
  const supabase = await createClient();
  const { error } = await supabase.from("income_transactions").insert(normalizedInput);
  if (error) throw new Error(error.message);
  revalidateIncomePaths();
}

export async function updateIncomeTransaction(id: string, input: IncomeTransactionInput) {
  const normalizedInput = normalizeIncomeTransactionInput(input);
  const supabase = await createClient();
  const { error } = await supabase.from("income_transactions").update(normalizedInput).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateIncomePaths();
}

export async function deleteIncomeTransaction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("income_transactions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateIncomePaths();
}

export async function addIncomeSource(name: string, type: "freelance_client" | "digital_product" | "other") {
  const supabase = await createClient();
  const { data, error } = await supabase.from("income_sources").insert({ name, type }).select().single();
  if (error) throw new Error(error.message);
  revalidatePath("/income");
  return data;
}
