"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { monthStart } from "@/lib/dates";
import { shouldPrepareMonth } from "@/lib/monthly-prep";
import type { FamilySupportDirection, FamilyTransferStatus } from "@/lib/supabase/types";

export interface FamilySupportEntryInput {
  month: string;
  entry_date: string | null;
  person: string;
  direction: FamilySupportDirection;
  description: string;
  amount: number;
  currency: string;
  fx_rate: number;
  amount_idr: number;
  notes: string | null;
}

export interface FamilyTransferInput {
  month: string;
  person: string;
  status: FamilyTransferStatus;
  transferred_at: string | null;
  notes: string | null;
}

const monthPattern = /^\d{4}-\d{2}-01$/;

function revalidateFamilyPaths() {
  revalidatePath("/family");
  revalidatePath("/exports");
}

function daysInMonth(month: string): number {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

function dateForDay(month: string, day: number): string {
  return `${month.slice(0, 7)}-${String(Math.min(Math.max(day, 1), daysInMonth(month))).padStart(2, "0")}`;
}

function normalizeFamilyEntry(input: FamilySupportEntryInput) {
  const month = input.month.trim();
  const person = input.person.trim();
  const description = input.description.trim();
  const amount = Number(input.amount);
  const fxRate = input.currency === "IDR" ? 1 : Number(input.fx_rate);
  const amountIdr = Math.round(amount * fxRate);

  if (!monthPattern.test(month)) throw new Error("Month must use YYYY-MM-01 format");
  if (!person) throw new Error("Person is required");
  if (input.direction !== "add" && input.direction !== "deduct") throw new Error("Choose Tambah or Potong");
  if (!description) throw new Error("Description is required");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than 0");
  if (!Number.isFinite(fxRate) || fxRate <= 0) throw new Error("FX rate must be greater than 0");
  if (!Number.isFinite(amountIdr) || amountIdr <= 0) throw new Error("Amount in IDR must be greater than 0");

  return {
    month,
    entry_date: input.entry_date || null,
    person,
    direction: input.direction,
    description,
    amount,
    currency: input.currency.trim() || "IDR",
    fx_rate: fxRate,
    amount_idr: amountIdr,
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };
}

function normalizeTransfer(input: FamilyTransferInput) {
  const month = input.month.trim();
  const person = input.person.trim();
  const transferredAt = input.status === "transferred" ? input.transferred_at : null;

  if (!monthPattern.test(month)) throw new Error("Month must use YYYY-MM-01 format");
  if (!person) throw new Error("Person is required");
  if (input.status !== "not_transferred" && input.status !== "transferred") {
    throw new Error("Choose a valid transfer status");
  }
  if (input.status === "transferred" && !transferredAt) {
    throw new Error("Transferred date is required");
  }

  return {
    month,
    person,
    status: input.status,
    transferred_at: transferredAt,
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };
}

export async function addFamilySupportEntry(input: FamilySupportEntryInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("family_support_entries").insert(normalizeFamilyEntry(input));
  if (error) throw new Error(error.message);
  revalidateFamilyPaths();
}

export async function updateFamilySupportEntry(id: string, input: FamilySupportEntryInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("family_support_entries").update(normalizeFamilyEntry(input)).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateFamilyPaths();
}

export async function deleteFamilySupportEntry(id: string) {
  const supabase = await createClient();
  const { data: entry, error: readError } = await supabase
    .from("family_support_entries")
    .select("routine_entry_id, generated_month, month")
    .eq("id", id)
    .maybeSingle();

  if (readError) throw new Error(readError.message);

  const { error } = await supabase.from("family_support_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (entry?.routine_entry_id) {
    const { error: skipError } = await supabase.from("family_routine_entry_skips").upsert(
      {
        routine_entry_id: entry.routine_entry_id,
        month: entry.generated_month ?? entry.month,
      },
      { onConflict: "routine_entry_id,month" }
    );
    if (skipError) throw new Error(skipError.message);
  }

  revalidateFamilyPaths();
}

export async function upsertFamilyTransfer(input: FamilyTransferInput) {
  const supabase = await createClient();
  const transfer = normalizeTransfer(input);
  const { error } = await supabase
    .from("family_support_transfers")
    .upsert(transfer, { onConflict: "month,person" });
  if (error) throw new Error(error.message);
  revalidateFamilyPaths();
}

export async function ensureMonthlyFamilyRoutineEntries(month: string) {
  if (!shouldPrepareMonth(month, monthStart())) {
    return { created: 0 };
  }

  const supabase = await createClient();
  const [
    { data: routines, error: routinesError },
    { data: existingEntries, error: existingError },
    { data: skips, error: skipsError },
  ] = await Promise.all([
    supabase
      .from("family_routine_entries")
      .select("id, person, direction, description, monthly_amount, currency, fx_rate, amount_idr, entry_day, notes")
      .eq("active", true)
      .gt("amount_idr", 0),
    supabase
      .from("family_support_entries")
      .select("person, direction, description, amount_idr, routine_entry_id")
      .eq("month", month),
    supabase
      .from("family_routine_entry_skips")
      .select("routine_entry_id")
      .eq("month", month),
  ]);

  if (routinesError) throw new Error(routinesError.message);
  if (existingError) throw new Error(existingError.message);
  if (skipsError) throw new Error(skipsError.message);

  const existing = existingEntries ?? [];
  const skippedRoutineIds = new Set((skips ?? []).map((skip) => skip.routine_entry_id));

  const inserts = (routines ?? []).flatMap((routine) => {
    const amountIdr = Math.round(Number(routine.amount_idr));
    if (skippedRoutineIds.has(routine.id)) return [];
    const exists = existing.some((entry) => {
      if (entry.routine_entry_id) return entry.routine_entry_id === routine.id;
      return (
        entry.person.toLowerCase() === routine.person.toLowerCase() &&
        entry.direction === routine.direction &&
        entry.description.toLowerCase() === routine.description.toLowerCase() &&
        Number(entry.amount_idr) === amountIdr
      );
    });

    if (exists) return [];

    return [
      {
        month,
        entry_date: dateForDay(month, routine.entry_day),
        person: routine.person,
        direction: routine.direction,
        description: routine.description,
        amount: Number(routine.monthly_amount),
        currency: routine.currency,
        fx_rate: Number(routine.fx_rate),
        amount_idr: amountIdr,
        notes: routine.notes,
        source_sheet: "Auto monthly",
        source_row: null,
        routine_entry_id: routine.id,
        generated_month: month,
      },
    ];
  });

  if (inserts.length === 0) {
    return { created: 0 };
  }

  const { error } = await supabase.from("family_support_entries").insert(inserts);
  if (error) throw new Error(error.message);

  return { created: inserts.length };
}
