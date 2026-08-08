"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setBudgets(
  month: string,
  entries: { category_id: string; budget_amount: number }[]
) {
  const supabase = await createClient();
  const rows = entries.map((e) => ({ ...e, month }));
  const { error } = await supabase.from("budgets").upsert(rows, { onConflict: "category_id,month" });
  if (error) throw new Error(error.message);
  revalidatePath("/budget");
  revalidatePath("/");
}
