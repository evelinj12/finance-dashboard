export interface PayoutAdjustment {
  id: string;
  team_member_id: string;
  date: string;
  reason: string;
  amount_idr: number;
  expense_transaction_id: string | null;
}

export interface AdjustmentSettlement {
  id: string;
  adjustment_id: string;
  team_member_id: string;
  amount_idr: number;
  settled_at: string;
  transfer_group_id: string | null;
}

export function remainingAdjustment(adjustment: PayoutAdjustment, settlements: AdjustmentSettlement[]) {
  return Math.max(0, Number(adjustment.amount_idr) - settlements
    .filter((row) => row.adjustment_id === adjustment.id)
    .reduce((sum, row) => sum + Number(row.amount_idr), 0));
}

export function previewDeductions(
  adjustments: PayoutAdjustment[], settlements: AdjustmentSettlement[], memberId: string,
  earnings: number, throughDate: string,
) {
  let available = Math.max(0, earnings);
  return adjustments.filter((row) => row.team_member_id === memberId && row.date <= throughDate)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .flatMap((row) => {
      const amount = Math.min(available, remainingAdjustment(row, settlements));
      available -= amount;
      return amount > 0 ? [{ adjustmentId: row.id, reason: row.reason, date: row.date, amountIdr: amount }] : [];
    });
}
