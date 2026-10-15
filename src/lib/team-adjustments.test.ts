import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { previewDeductions, remainingAdjustment, type PayoutAdjustment, type AdjustmentSettlement } from "./team-adjustments";

const adjustment = (id: string, amount: number, date = "2026-10-01", member = "kevin"): PayoutAdjustment => ({
  id, amount_idr: amount, date, team_member_id: member, reason: id, expense_transaction_id: null,
});
const settlement = (id: string, amount: number): AdjustmentSettlement => ({
  id: "s-" + id, adjustment_id: id, team_member_id: "kevin", amount_idr: amount,
  settled_at: "2026-10-02", transfer_group_id: null,
});
describe("payout deductions", () => {
  it("deducts partial repayments and carries the remainder across months", () => {
    const row = adjustment("gift", 300_000);
    assert.equal(remainingAdjustment(row, [settlement("gift", 100_000)]), 200_000);
    assert.equal(previewDeductions([row], [settlement("gift", 100_000)], "kevin", 150_000, "2026-11-05")[0].amountIdr, 150_000);
  });
  it("uses oldest debts first, excludes future and other-member adjustments, and never exceeds earnings", () => {
    const rows = [adjustment("new", 200_000, "2026-10-02"), adjustment("old", 100_000),
      adjustment("future", 100_000, "2026-11-01"), adjustment("other", 100_000, "2026-10-01", "someone-else")];
    assert.deepEqual(previewDeductions(rows, [], "kevin", 150_000, "2026-10-15").map((row) => [row.adjustmentId, row.amountIdr]),
      [["old", 100_000], ["new", 50_000]]);
  });
  it("does not reuse settled deductions or deduct from zero earnings", () => {
    assert.deepEqual(previewDeductions([adjustment("gift", 300_000)], [settlement("gift", 300_000)], "kevin", 2_000_000, "2026-10-15"), []);
    assert.deepEqual(previewDeductions([adjustment("gift", 300_000)], [], "kevin", 0, "2026-10-15"), []);
  });
});
