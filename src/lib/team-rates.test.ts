import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateTeamAmount, monthFromDate } from "./team-rates";

describe("monthFromDate", () => {
  it("normalizes a work date to its month key", () => {
    assert.equal(monthFromDate("2026-09-30"), "2026-09-01");
  });
});

describe("calculateTeamAmount", () => {
  it("calculates original currency and IDR amount from a monthly rate", () => {
    assert.deepEqual(calculateTeamAmount(0.67, { hourly_rate: 11.5, currency: "USD", fx_rate: 17500 }), {
      amount: 7.71,
      currency: "USD",
      fxRate: 17500,
      amountIdr: 134925,
    });
  });

  it("uses one-to-one FX for IDR rates", () => {
    assert.deepEqual(calculateTeamAmount(2, { hourly_rate: 100000, currency: "IDR", fx_rate: 999 }), {
      amount: 200000,
      currency: "IDR",
      fxRate: 1,
      amountIdr: 200000,
    });
  });

  it("returns null when hours or rates cannot produce a payout", () => {
    assert.equal(calculateTeamAmount(null, { hourly_rate: 10, currency: "AUD", fx_rate: 11000 }), null);
    assert.equal(calculateTeamAmount(1, { hourly_rate: 0, currency: "AUD", fx_rate: 11000 }), null);
  });
});
