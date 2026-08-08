export type DisplayCurrency = "IDR" | "USD";

// Fallback rate used to convert IDR-native amounts to USD for display when
// toggled. Real entries always store their own fx_rate; this is only used
// for on-the-fly display conversion of amounts already stored in IDR.
// Editable from Settings.
export const DEFAULT_USD_IDR_RATE = 17957;

export function formatMoney(amount: number, currency: DisplayCurrency) {
  return new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "IDR" ? 0 : 2,
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
