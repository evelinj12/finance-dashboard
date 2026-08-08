"use client";

import { Button } from "@/components/ui/button";
import { useCurrency } from "@/components/currency-provider";

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setCurrency(currency === "IDR" ? "USD" : "IDR")}
    >
      {currency}
    </Button>
  );
}
