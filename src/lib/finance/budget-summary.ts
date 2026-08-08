import type { CategoryTag, TxDirection } from "@/lib/supabase/types";

export function budgetActualFromTransaction(
  tag: CategoryTag,
  direction: TxDirection,
  amountIdr: number,
): number {
  if (tag === "income") return direction === "in" ? amountIdr : -amountIdr;
  return direction === "out" ? amountIdr : -amountIdr;
}

export function budgetDifference(
  tag: CategoryTag,
  budgetIdr: number,
  actualIdr: number,
): number {
  return tag === "income" ? actualIdr - budgetIdr : budgetIdr - actualIdr;
}
