export interface ClientGrossInput {
  grossAmountIdr: number;
  grossHours: number;
  teamAmountIdr: number;
  teamHours: number;
}

export interface ClientNetResult {
  netAmountIdr: number;
  netHours: number;
}

export function calculateClientNet(input: ClientGrossInput): ClientNetResult {
  return {
    netAmountIdr: input.grossAmountIdr - input.teamAmountIdr,
    netHours: Math.max(0, input.grossHours - input.teamHours),
  };
}

export function savingHealthDataStatus(input: {
  hasIncomeData: boolean;
  hasExpenseData: boolean;
}): "identified" | "unidentified" {
  return input.hasIncomeData && input.hasExpenseData
    ? "identified"
    : "unidentified";
}

export function ratioTrend(
  currentRatio: number | null,
  previousRatio: number | null,
): "up" | "down" | "flat" {
  if (currentRatio === null || previousRatio === null) return "flat";
  if (currentRatio > previousRatio) return "up";
  if (currentRatio < previousRatio) return "down";
  return "flat";
}
