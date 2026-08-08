import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateSavingHealth,
  savingHealthPercent,
  savingHealthStatus,
} from "./monthly-summary";

describe("calculateSavingHealth", () => {
  it("includes sinking funds plus positive leftover net", () => {
    assert.deepEqual(
      calculateSavingHealth({
        totalIncomeIdr: 40_000_000,
        trueExpensesIdr: 10_000_000,
        sinkingFundsIdr: 5_000_000,
      }),
      {
        netAfterSavingsIdr: 25_000_000,
        savedAmountIdr: 30_000_000,
        savingHealthRatio: 0.75,
      },
    );
  });

  it("excludes negative leftover net from saved amount", () => {
    assert.deepEqual(
      calculateSavingHealth({
        totalIncomeIdr: 10_000_000,
        trueExpensesIdr: 8_000_000,
        sinkingFundsIdr: 4_000_000,
      }),
      {
        netAfterSavingsIdr: -2_000_000,
        savedAmountIdr: 4_000_000,
        savingHealthRatio: 0.4,
      },
    );
  });

  it("returns a zero saving health ratio when income is zero", () => {
    assert.equal(
      calculateSavingHealth({
        totalIncomeIdr: 0,
        trueExpensesIdr: 1_000_000,
        sinkingFundsIdr: 2_000_000,
      }).savingHealthRatio,
      0,
    );
  });
});

describe("savingHealthStatus", () => {
  it("reports on target only when the ratio is above 50%", () => {
    assert.equal(savingHealthStatus(0.51), "On target");
    assert.equal(savingHealthStatus(0.5), "Below target");
    assert.equal(savingHealthStatus(0.2), "Below target");
  });
});

describe("savingHealthPercent", () => {
  it("formats a ratio as whole percentage text", () => {
    assert.equal(savingHealthPercent(0.75), "75%");
  });

  it("rounds fractional percentages to the nearest whole percent", () => {
    assert.equal(savingHealthPercent(0.505), "51%");
  });
});
