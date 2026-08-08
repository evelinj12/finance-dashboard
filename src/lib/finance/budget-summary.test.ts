import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  budgetActualFromTransaction,
  budgetDifference,
} from "./budget-summary";

describe("budgetActualFromTransaction", () => {
  it("shows outflow budget categories as positive actual spend", () => {
    assert.equal(budgetActualFromTransaction("sinking_fund", "out", 2_000_000), 2_000_000);
    assert.equal(budgetActualFromTransaction("fixed", "out", 536_000), 536_000);
    assert.equal(budgetActualFromTransaction("spent", "out", 185_000), 185_000);
  });

  it("keeps income categories signed by cash direction", () => {
    assert.equal(budgetActualFromTransaction("income", "in", 1_000_000), 1_000_000);
    assert.equal(budgetActualFromTransaction("income", "out", 250_000), -250_000);
  });
});

describe("budgetDifference", () => {
  it("subtracts positive actual outflows from outflow budgets", () => {
    assert.equal(budgetDifference("sinking_fund", 2_000_000, 2_000_000), 0);
    assert.equal(budgetDifference("sinking_fund", 600_000, 572_000), 28_000);
  });

  it("compares income actuals against income budgets", () => {
    assert.equal(budgetDifference("income", 12_000_000, 10_000_000), -2_000_000);
    assert.equal(budgetDifference("income", 12_000_000, 15_000_000), 3_000_000);
  });
});
