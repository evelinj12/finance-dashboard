"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
  const { error } = await supabase.from("family_support_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
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
