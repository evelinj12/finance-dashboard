export interface SavingHealthInput {
  totalIncomeIdr: number;
  trueExpensesIdr: number;
  sinkingFundsIdr: number;
}

export interface SavingHealthResult {
  netAfterSavingsIdr: number;
  savedAmountIdr: number;
  savingHealthRatio: number;
}

export function calculateSavingHealth(
  input: SavingHealthInput,
): SavingHealthResult {
  const netAfterSavingsIdr =
    input.totalIncomeIdr - input.trueExpensesIdr - input.sinkingFundsIdr;
  const savedAmountIdr =
    input.sinkingFundsIdr + Math.max(netAfterSavingsIdr, 0);

  return {
    netAfterSavingsIdr,
    savedAmountIdr,
    savingHealthRatio:
      input.totalIncomeIdr > 0 ? savedAmountIdr / input.totalIncomeIdr : 0,
  };
}

export function savingHealthStatus(ratio: number): "On target" | "Below target" {
  return ratio > 0.5 ? "On target" : "Below target";
}

export function savingHealthPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
