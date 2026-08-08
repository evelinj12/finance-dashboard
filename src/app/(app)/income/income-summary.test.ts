import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildIncomeSummary, normalizeIncomePaymentStatus } from "./income-summary";

describe("buildIncomeSummary", () => {
  it("splits paid and waiting income totals", () => {
    const summary = buildIncomeSummary({
      incomeTransactions: [
        {
          id: "paid-1",
          income_source_id: "client-1",
          amount_idr: 10_000_000,
          payment_status: "paid",
          status: null,
          total_hours: 12,
          income_source: { name: "Client A", type: "freelance_client" },
        },
        {
          id: "waiting-1",
          income_source_id: "product-1",
          amount_idr: 3_000_000,
          payment_status: "waiting",
          status: null,
          total_hours: null,
          income_source: { name: "Course", type: "digital_product" },
        },
      ],
      teamEntries: [],
    });

    assert.equal(summary.paidAmountIdr, 10_000_000);
    assert.equal(summary.waitingAmountIdr, 3_000_000);
  });

  it("deducts team money and hours from freelance client rows only", () => {
    const summary = buildIncomeSummary({
      incomeTransactions: [
        {
          id: "client-income",
          income_source_id: "client-1",
          amount_idr: 20_000_000,
          payment_status: "paid",
          status: null,
          total_hours: 40,
          income_source: { name: "Client A", type: "freelance_client" },
        },
        {
          id: "product-income",
          income_source_id: "product-1",
          amount_idr: 5_000_000,
          payment_status: "paid",
          status: null,
          total_hours: 5,
          income_source: { name: "Course", type: "digital_product" },
        },
      ],
      teamEntries: [
        {
          id: "team-client",
          income_source_id: "client-1",
          amount_idr: 6_000_000,
          hours: 15,
          income_source: { name: "Client A", type: "freelance_client" },
        },
        {
          id: "team-product",
          income_source_id: "product-1",
          amount_idr: 2_000_000,
          hours: 4,
          income_source: { name: "Course", type: "digital_product" },
        },
      ],
    });

    assert.deepEqual(summary.clientRows, [
      {
        id: "client-1",
        name: "Client A",
        grossAmountIdr: 20_000_000,
        grossHours: 40,
        teamAmountIdr: 6_000_000,
        teamHours: 15,
        netAmountIdr: 14_000_000,
        netHours: 25,
      },
    ]);
  });

  it("normalizes legacy income statuses like the migration", () => {
    for (const legacyStatus of ["waiting", "pending", "unpaid", "owed", " WAITING "]) {
      assert.equal(normalizeIncomePaymentStatus(null, legacyStatus), "waiting");
    }
    for (const legacyStatus of ["paid", "success", "completed", "complete", " SUCCESS "]) {
      assert.equal(normalizeIncomePaymentStatus(null, legacyStatus), "paid");
    }
    assert.equal(normalizeIncomePaymentStatus("waiting", "success"), "waiting");
    assert.equal(normalizeIncomePaymentStatus("paid", "owed"), "paid");
    assert.equal(normalizeIncomePaymentStatus(null, "unknown"), "waiting");
    assert.equal(normalizeIncomePaymentStatus(null, null), "waiting");
  });
});
