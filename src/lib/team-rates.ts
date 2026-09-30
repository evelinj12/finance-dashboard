export interface TeamRateLike {
  hourly_rate: number;
  currency: string;
  fx_rate: number;
}

export interface CalculatedTeamAmount {
  amount: number;
  currency: string;
  fxRate: number;
  amountIdr: number;
}

export function monthFromDate(date: string) {
  return `${date.slice(0, 7)}-01`;
}

export function calculateTeamAmount(hours: number | null | undefined, rate: TeamRateLike): CalculatedTeamAmount | null {
  if (!Number.isFinite(hours) || !hours || hours <= 0) return null;
  if (!Number.isFinite(rate.hourly_rate) || rate.hourly_rate <= 0) return null;
  if (!Number.isFinite(rate.fx_rate) || rate.fx_rate <= 0) return null;

  const amount = Math.round(hours * rate.hourly_rate * 100) / 100;
  const fxRate = rate.currency === "IDR" ? 1 : rate.fx_rate;

  return {
    amount,
    currency: rate.currency || "IDR",
    fxRate,
    amountIdr: Math.round(amount * fxRate),
  };
}
