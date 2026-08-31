"use server";

import { revalidatePath } from "next/cache";
import { buildChecklistCarryoverItems } from "@/lib/checklist-carryover";
import { createClient } from "@/lib/supabase/server";
import { monthRange, monthStart } from "@/lib/dates";
import type { RecurringTransactionType, TransactionSource } from "@/lib/supabase/types";

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

export interface ChecklistItemInput {
  month: string;
  title: string;
  latest_date_note: string | null;
  completed?: boolean;
}

interface ExistingRecurringTransaction {
  id: string;
  date: string;
  source: TransactionSource;
  source_income_transaction_id: string | null;
  source_team_transfer_group_id: string | null;
  recurring_type: RecurringTransactionType | null;
  recurring_template_id: string | null;
  generated_month: string | null;
}

function firstOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function daysInMonth(month: string): number {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

function dateForDay(month: string, day: number): string {
  return `${month.slice(0, 7)}-${String(Math.min(Math.max(day, 1), daysInMonth(month))).padStart(2, "0")}`;
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

function normalizeChecklistItemInput(input: ChecklistItemInput): ChecklistItemInput {
  const month = input.month?.trim();
  const title = input.title?.trim();

  if (!month || !/^\d{4}-\d{2}-01$/.test(month)) {
    throw new Error("Month is required");
  }
  if (!title) {
    throw new Error("Checklist item is required");
  }

  return {
    month,
    title,
    latest_date_note: input.latest_date_note?.trim() || null,
    completed: input.completed ?? false,
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
  const { data: transaction, error: readError } = await supabase
    .from("transactions")
    .select(
      "id, date, source, source_income_transaction_id, source_team_transfer_group_id, recurring_type, recurring_template_id, generated_month"
    )
    .eq("id", id)
    .maybeSingle<ExistingRecurringTransaction>();

  if (readError) throw new Error(readError.message);

  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (
    transaction?.source === "auto_monthly" &&
    transaction.recurring_type &&
    transaction.recurring_template_id
  ) {
    const { error: skipError } = await supabase.from("recurring_transaction_skips").upsert(
      {
        recurring_type: transaction.recurring_type,
        recurring_template_id: transaction.recurring_template_id,
        month: transaction.generated_month ?? firstOfMonth(transaction.date),
      },
      { onConflict: "recurring_type,recurring_template_id,month" }
    );
    if (skipError) throw new Error(skipError.message);
  }

  if (transaction?.source === "income_auto" && transaction.source_income_transaction_id) {
    const { error: disableError } = await supabase
      .from("income_transactions")
      .update({ transaction_posting_disabled: true, transaction_posted_at: null })
      .eq("id", transaction.source_income_transaction_id);

    if (disableError) throw new Error(disableError.message);
  }

  if (transaction?.source === "team_transfer" && transaction.source_team_transfer_group_id) {
    const { error: entriesError } = await supabase
      .from("team_work_entries")
      .update({
        status: "owed",
        paid_at: null,
        transfer_group_id: null,
      })
      .eq("transfer_group_id", transaction.source_team_transfer_group_id);

    if (entriesError) throw new Error(entriesError.message);
  }

  revalidatePath("/transactions");
  revalidatePath("/budget");
  revalidatePath("/income");
  revalidatePath("/team");
  revalidatePath("/saving-health");
  revalidatePath("/");
}

export async function addChecklistItem(input: ChecklistItemInput) {
  const normalizedInput = normalizeChecklistItemInput(input);
  const supabase = await createClient();
  const { data: lastItem, error: lastItemError } = await supabase
    .from("transaction_checklist_items")
    .select("sort_order")
    .eq("month", normalizedInput.month)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastItemError) throw new Error(lastItemError.message);

  const { error } = await supabase.from("transaction_checklist_items").insert({
    ...normalizedInput,
    sort_order: (lastItem?.sort_order ?? 0) + 10,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
}

export async function updateChecklistItem(id: string, input: ChecklistItemInput) {
  const normalizedInput = normalizeChecklistItemInput(input);
  const supabase = await createClient();
  const { error } = await supabase.from("transaction_checklist_items").update({
    title: normalizedInput.title,
    latest_date_note: normalizedInput.latest_date_note,
    completed: normalizedInput.completed ?? false,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
}

export async function toggleChecklistItem(id: string, completed: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("transaction_checklist_items")
    .update({ completed, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
}

export async function deleteChecklistItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("transaction_checklist_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/transactions");
}

export async function ensureMonthlyRecurringTransactions(month: string) {
  if (!/^\d{4}-\d{2}-01$/.test(month) || month !== monthStart()) {
    return { created: 0 };
  }

  const supabase = await createClient();
  const [start, nextStart] = monthRange(month);
  const [
    { data: sinkingFunds, error: sinkingError },
    { data: fixedTransactions, error: fixedError },
    { data: existingTransactions, error: existingError },
    { data: skips, error: skipsError },
  ] = await Promise.all([
    supabase
      .from("sinking_funds")
      .select("id, category_id, name, monthly_amount, notes")
      .not("category_id", "is", null)
      .gte("monthly_amount", 0),
    supabase
      .from("fixed_transactions")
      .select("id, category_id, name, monthly_amount, due_day, notes")
      .eq("active", true)
      .gte("monthly_amount", 0),
    supabase
      .from("transactions")
      .select("category_id, amount_idr, source, recurring_type, recurring_template_id")
      .gte("date", start)
      .lt("date", nextStart),
    supabase
      .from("recurring_transaction_skips")
      .select("recurring_type, recurring_template_id")
      .eq("month", month),
  ]);

  if (sinkingError) throw new Error(sinkingError.message);
  if (fixedError) throw new Error(fixedError.message);
  if (existingError) throw new Error(existingError.message);
  if (skipsError) throw new Error(skipsError.message);

  const existing = existingTransactions ?? [];
  const skippedKeys = new Set(
    (skips ?? []).map((skip) => `${skip.recurring_type}:${skip.recurring_template_id}`)
  );

  function hasExistingRow(
    recurringType: RecurringTransactionType,
    templateId: string,
    categoryId: string,
    amountIdr: number
  ) {
    return existing.some((row) => {
      if (row.source === "auto_monthly") {
        return row.recurring_type === recurringType && row.recurring_template_id === templateId;
      }
      return row.category_id === categoryId && Number(row.amount_idr) === amountIdr;
    });
  }

  const inserts = [
    ...(sinkingFunds ?? []).flatMap((fund) => {
      if (!fund.category_id) return [];
      const amountIdr = Math.round(Number(fund.monthly_amount));
      if (
        skippedKeys.has(`sinking_fund:${fund.id}`) ||
        hasExistingRow("sinking_fund", fund.id, fund.category_id, amountIdr)
      ) {
        return [];
      }

      return [
        {
          date: start,
          category_id: fund.category_id,
          direction: "out" as const,
          amount: amountIdr,
          currency: "IDR",
          fx_rate: 1,
          amount_idr: amountIdr,
          notes: fund.notes || `${fund.name} monthly sinking fund`,
          save_to: "pasar uang",
          source: "auto_monthly" as const,
          recurring_type: "sinking_fund" as const,
          recurring_template_id: fund.id,
          generated_month: month,
        },
      ];
    }),
    ...(fixedTransactions ?? []).flatMap((fixed) => {
      const amountIdr = Math.round(Number(fixed.monthly_amount));
      if (
        skippedKeys.has(`fixed_transaction:${fixed.id}`) ||
        hasExistingRow("fixed_transaction", fixed.id, fixed.category_id, amountIdr)
      ) {
        return [];
      }

      return [
        {
          date: dateForDay(month, fixed.due_day),
          category_id: fixed.category_id,
          direction: "out" as const,
          amount: amountIdr,
          currency: "IDR",
          fx_rate: 1,
          amount_idr: amountIdr,
          notes: fixed.notes || fixed.name,
          save_to: null,
          source: "auto_monthly" as const,
          recurring_type: "fixed_transaction" as const,
          recurring_template_id: fixed.id,
          generated_month: month,
        },
      ];
    }),
  ];

  if (inserts.length === 0) {
    return { created: 0 };
  }

  const { error } = await supabase.from("transactions").insert(inserts);
  if (error) throw new Error(error.message);

  return { created: inserts.length };
}

export async function ensureMonthlyChecklistItems(month: string) {
  if (!/^\d{4}-\d{2}-01$/.test(month) || month !== monthStart()) {
    return { created: 0 };
  }

  const supabase = await createClient();
  const { count: currentCount, error: currentError } = await supabase
    .from("transaction_checklist_items")
    .select("id", { count: "exact", head: true })
    .eq("month", month);

  if (currentError) throw new Error(currentError.message);
  if ((currentCount ?? 0) > 0) return { created: 0 };

  const { data: previousMonthRow, error: previousMonthError } = await supabase
    .from("transaction_checklist_items")
    .select("month")
    .lt("month", month)
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previousMonthError) throw new Error(previousMonthError.message);
  if (!previousMonthRow?.month) return { created: 0 };

  const { data: previousItems, error: previousItemsError } = await supabase
    .from("transaction_checklist_items")
    .select("title, latest_date_note, sort_order")
    .eq("month", previousMonthRow.month)
    .order("sort_order");

  if (previousItemsError) throw new Error(previousItemsError.message);
  const inserts = buildChecklistCarryoverItems(month, previousItems ?? []);
  if (inserts.length === 0) return { created: 0 };

  const { error } = await supabase.from("transaction_checklist_items").insert(inserts);
  if (error) throw new Error(error.message);

  return { created: inserts.length };
}
