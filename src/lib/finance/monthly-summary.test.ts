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

  it("only counts savings covered by income after true expenses", () => {
    assert.deepEqual(
      calculateSavingHealth({
        totalIncomeIdr: 10_000_000,
        trueExpensesIdr: 8_000_000,
        sinkingFundsIdr: 4_000_000,
      }),
      {
        netAfterSavingsIdr: -2_000_000,
        savedAmountIdr: 2_000_000,
        savingHealthRatio: 0.2,
      },
    );
  });

  it("does not report impossible savings when expenses already exceed income", () => {
    assert.deepEqual(
      calculateSavingHealth({
        totalIncomeIdr: 414_001,
        trueExpensesIdr: 2_983_304,
        sinkingFundsIdr: 4_505_654,
      }),
      {
        netAfterSavingsIdr: -7_074_957,
        savedAmountIdr: 0,
        savingHealthRatio: 0,
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

  it("reports below target when the month is negative after savings", () => {
    assert.equal(savingHealthStatus(10.88, -7_074_957), "Below target");
  });

  it("reports unidentified when the month does not have enough data", () => {
    assert.equal(savingHealthStatus(0.7, 1_000_000, false), "Unidentified");
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
