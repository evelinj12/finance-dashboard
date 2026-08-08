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

export type SavingHealthStatus = "On target" | "Below target" | "Unidentified";

export function calculateSavingHealth(
  input: SavingHealthInput,
): SavingHealthResult {
  const netAfterSavingsIdr =
    input.totalIncomeIdr - input.trueExpensesIdr - input.sinkingFundsIdr;
  const incomeAfterTrueExpensesIdr =
    input.totalIncomeIdr - input.trueExpensesIdr;
  const savedAmountIdr =
    Math.max(0, Math.min(
      input.sinkingFundsIdr + Math.max(netAfterSavingsIdr, 0),
      incomeAfterTrueExpensesIdr,
    ));

  return {
    netAfterSavingsIdr,
    savedAmountIdr,
    savingHealthRatio:
      input.totalIncomeIdr > 0 ? savedAmountIdr / input.totalIncomeIdr : 0,
  };
}

export function savingHealthStatus(
  ratio: number,
  netAfterSavingsIdr = 0,
  identified = true,
): SavingHealthStatus {
  if (!identified) return "Unidentified";

  return ratio > 0.5 && netAfterSavingsIdr >= 0 ? "On target" : "Below target";
}

export function savingHealthPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
