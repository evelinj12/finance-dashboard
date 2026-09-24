export type DisplayCurrency = "IDR" | "USD";
export type MoneyCurrency = DisplayCurrency | "AUD";

// Fallback rate used to convert IDR-native amounts to USD for display when
// toggled. Real entries always store their own fx_rate; this is only used
// for on-the-fly display conversion of amounts already stored in IDR.
// Editable from Settings.
export const DEFAULT_USD_IDR_RATE = 17803;
export const DEFAULT_AUD_IDR_RATE = 12611;

export function defaultIdrRateForCurrency(currency: string) {
  if (currency === "IDR") return 1;
  if (currency === "AUD") return DEFAULT_AUD_IDR_RATE;
  return DEFAULT_USD_IDR_RATE;
}

export function formatMoney(amount: number, currency: MoneyCurrency | string) {
  if (currency === "IDR") {
    return `Rp ${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(amount)}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Converts an amount already stored in IDR to the requested display currency.
export function displayFromIdr(
  amountIdr: number,
  target: DisplayCurrency,
  usdIdrRate: number = DEFAULT_USD_IDR_RATE
) {
  return target === "IDR" ? amountIdr : amountIdr / usdIdrRate;
}
