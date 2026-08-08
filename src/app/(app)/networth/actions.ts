"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface SnapshotInput {
  month: string;
  cash: number;
  investments: number;
  retirement: number;
  personal: number;
  unsecured_liabilities: number;
  secured_liabilities: number;
  notes: string | null;
}

export async function upsertSnapshot(input: SnapshotInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("net_worth_snapshots").upsert(input, { onConflict: "month" });
  if (error) throw new Error(error.message);
  revalidatePath("/networth");
  revalidatePath("/");
}

export async function deleteSnapshot(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("net_worth_snapshots").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/networth");
  revalidatePath("/");
}
