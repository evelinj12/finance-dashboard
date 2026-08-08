import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateClientNet,
  ratioTrend,
  savingHealthDataStatus,
} from "./team-net";

describe("calculateClientNet", () => {
  it("deducts team money from gross client money", () => {
    assert.equal(
      calculateClientNet({
        grossAmountIdr: 12_000_000,
        grossHours: 20,
        teamAmountIdr: 3_500_000,
        teamHours: 4,
      }).netAmountIdr,
      8_500_000,
    );
  });

  it("deducts team time from gross client time", () => {
    assert.equal(
      calculateClientNet({
        grossAmountIdr: 12_000_000,
        grossHours: 20,
        teamAmountIdr: 3_500_000,
        teamHours: 4.5,
      }).netHours,
      15.5,
    );
  });

  it("never returns negative net time", () => {
    assert.equal(
      calculateClientNet({
        grossAmountIdr: 12_000_000,
        grossHours: 2,
        teamAmountIdr: 3_500_000,
        teamHours: 4,
      }).netHours,
      0,
    );
  });
});

describe("savingHealthDataStatus", () => {
  it("returns unidentified when a month is missing income or expense data", () => {
    assert.equal(
      savingHealthDataStatus({ hasIncomeData: true, hasExpenseData: false }),
      "unidentified",
    );
    assert.equal(
      savingHealthDataStatus({ hasIncomeData: false, hasExpenseData: true }),
      "unidentified",
    );
  });

  it("returns identified when a month has income and expense data", () => {
    assert.equal(
      savingHealthDataStatus({ hasIncomeData: true, hasExpenseData: true }),
      "identified",
    );
  });
});

describe("ratioTrend", () => {
  it("returns up, down, or flat for ratio movement", () => {
    assert.equal(ratioTrend(0.6, 0.5), "up");
    assert.equal(ratioTrend(0.4, 0.5), "down");
    assert.equal(ratioTrend(0.5, 0.5), "flat");
  });

  it("returns flat when either ratio is missing", () => {
    assert.equal(ratioTrend(null, 0.5), "flat");
    assert.equal(ratioTrend(0.5, null), "flat");
  });
});
