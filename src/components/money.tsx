"use client";

import { useCurrency } from "@/components/currency-provider";
import { displayFromIdr, formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";

// Renders an amount that's stored in IDR, converted to the user's chosen
// display currency. Positive/negative gets colored when `signed` is set.
export function Money({
  amountIdr,
  signed,
  className,
}: {
  amountIdr: number;
  signed?: boolean;
  className?: string;
}) {
  const { currency, usdIdrRate } = useCurrency();
  const value = displayFromIdr(amountIdr, currency, usdIdrRate);

  return (
    <span
      className={cn(
        signed && value > 0 && "text-emerald-600 dark:text-emerald-400",
        signed && value < 0 && "text-red-600 dark:text-red-400",
        className
      )}
    >
      {formatMoney(value, currency)}
    </span>
  );
}
