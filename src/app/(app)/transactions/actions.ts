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

function isDirection(value: unknown): value is TransactionInput["direction"] {
  return value === "in" || value === "out";
}

function normalizeTransactionInput(input: TransactionInput): TransactionInput {
  const date = input.date?.trim();
  const categoryId = input.category_id?.trim();
  const currency = input.currency?.trim() || "IDR";
  const amount = Number(input.amount);
  const fxRate = Number(input.fx_rate);

  if (!date) {
    throw new Error("Date is required");
  }
  if (!categoryId) {
    throw new Error("Category is required");
  }
  if (!isDirection(input.direction)) {
    throw new Error("Invalid transaction direction");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }
  if (!Number.isFinite(fxRate) || fxRate <= 0) {
    throw new Error("FX rate must be greater than 0");
  }

  const notes = input.notes?.trim() || null;
  const saveTo = input.save_to?.trim() || null;

  return {
    ...input,
    date,
    category_id: categoryId,
    direction: input.direction,
    amount,
    currency,
    fx_rate: fxRate,
    amount_idr: Math.round(amount * fxRate),
    notes,
    save_to: saveTo,
  };
}

export async function addTransaction(input: TransactionInput) {
  const normalizedInput = normalizeTransactionInput(input);
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").insert(normalizedInput);
  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
  revalidatePath("/budget");
  revalidatePath("/");
}

export async function updateTransaction(id: string, input: TransactionInput) {
  const normalizedInput = normalizeTransactionInput(input);
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").update(normalizedInput).eq("id", id);
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
