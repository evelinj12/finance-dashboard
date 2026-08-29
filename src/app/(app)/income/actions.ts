"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { monthRange } from "@/lib/dates";
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
  revalidatePath("/transactions");
  revalidatePath("/budget");
  revalidatePath("/saving-health");
  revalidatePath("/");
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function getIncomeCategoryId(supabase: SupabaseServerClient) {
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name, source_key")
    .eq("tag", "income")
    .eq("active", true)
    .order("sort_order");

  if (error) throw new Error(`Failed to load income categories: ${error.message}`);

  const category =
    categories?.find((item) => item.source_key === "work_income") ??
    categories?.find((item) => item.name.toLowerCase() === "work income") ??
    categories?.[0];

  if (category) return category.id;

  const { data: created, error: createError } = await supabase
    .from("categories")
    .insert({
      name: "Work income",
      tag: "income",
      notes: "Generated from paid income submissions.",
      sort_order: 20,
      source_key: "work_income",
    })
    .select("id")
    .single();

  if (createError) throw new Error(`Failed to create income category: ${createError.message}`);
  return created.id;
}

async function syncIncomeTransactionToTransaction(
  supabase: SupabaseServerClient,
  id: string,
  input: IncomeTransactionInput,
  reenablePosting = false
) {
  if (input.payment_status !== "paid") {
    const { error: deleteError } = await supabase
      .from("transactions")
      .delete()
      .eq("source_income_transaction_id", id);

    if (deleteError) throw new Error(deleteError.message);

    const { error: updateError } = await supabase
      .from("income_transactions")
      .update({ transaction_posted_at: null })
      .eq("id", id);

    if (updateError) throw new Error(updateError.message);
    return;
  }

  if (reenablePosting) {
    const { error } = await supabase
      .from("income_transactions")
      .update({ transaction_posting_disabled: false })
      .eq("id", id);

    if (error) throw new Error(error.message);
  }

  const categoryId = await getIncomeCategoryId(supabase);
  const { error: upsertError } = await supabase.from("transactions").upsert(
    {
      date: input.date,
      category_id: categoryId,
      direction: "in",
      amount: input.amount,
      currency: input.currency,
      fx_rate: input.fx_rate,
      amount_idr: input.amount_idr,
      notes: input.description || "Income payment",
      save_to: null,
      source: "income_auto",
      generated_from: "income_transaction",
      source_income_transaction_id: id,
      source_team_transfer_group_id: null,
      recurring_type: null,
      recurring_template_id: null,
      generated_month: `${input.date.slice(0, 7)}-01`,
    },
    { onConflict: "source_income_transaction_id" }
  );

  if (upsertError) throw new Error(upsertError.message);

  const { error: updateError } = await supabase
    .from("income_transactions")
    .update({ transaction_posted_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) throw new Error(updateError.message);
}

export async function addIncomeTransaction(input: IncomeTransactionInput) {
  const normalizedInput = normalizeIncomeTransactionInput(input);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("income_transactions")
    .insert(normalizedInput)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await syncIncomeTransactionToTransaction(supabase, data.id, normalizedInput);
  revalidateIncomePaths();
}

export async function updateIncomeTransaction(id: string, input: IncomeTransactionInput) {
  const normalizedInput = normalizeIncomeTransactionInput(input);
  const supabase = await createClient();
  const { error } = await supabase.from("income_transactions").update(normalizedInput).eq("id", id);
  if (error) throw new Error(error.message);
  await syncIncomeTransactionToTransaction(supabase, id, normalizedInput, true);
  revalidateIncomePaths();
}

export async function deleteIncomeTransaction(id: string) {
  const supabase = await createClient();
  const { error: transactionError } = await supabase
    .from("transactions")
    .delete()
    .eq("source_income_transaction_id", id);
  if (transactionError) throw new Error(transactionError.message);

  const { error } = await supabase.from("income_transactions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateIncomePaths();
}

export async function ensurePaidIncomeTransactions(month: string) {
  if (!/^\d{4}-\d{2}-01$/.test(month)) {
    return { synced: 0 };
  }

  const supabase = await createClient();
  const [start, end] = monthRange(month);
  const { data, error } = await supabase
    .from("income_transactions")
    .select(
      "id, income_source_id, date, description, amount, currency, fx_rate, amount_idr, payment_status, total_hours, transaction_posting_disabled"
    )
    .eq("payment_status", "paid")
    .eq("transaction_posting_disabled", false)
    .gte("date", start)
    .lt("date", end);

  if (error) throw new Error(error.message);

  let synced = 0;
  for (const row of data ?? []) {
    await syncIncomeTransactionToTransaction(supabase, row.id, {
      income_source_id: row.income_source_id,
      date: row.date,
      description: row.description,
      amount: row.amount,
      currency: row.currency,
      fx_rate: row.fx_rate,
      amount_idr: row.amount_idr,
      payment_status: row.payment_status,
      total_hours: row.total_hours,
    });
    synced += 1;
  }

  return { synced };
}

export async function addIncomeSource(name: string, type: "freelance_client" | "digital_product" | "other") {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Source name is required");
  if (!["freelance_client", "digital_product", "other"].includes(type)) {
    throw new Error("Choose a valid source type");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("income_sources").insert({ name: normalizedName, type }).select().single();
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/income");
  revalidatePath("/team");
  return data;
}
