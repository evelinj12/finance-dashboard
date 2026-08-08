"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/components/currency-provider";

export function CurrencySection() {
  const { usdIdrRate, setUsdIdrRate } = useCurrency();
  const [value, setValue] = useState(String(usdIdrRate));

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-2">
        <Label>USD → IDR rate (used to convert display when you switch to USD)</Label>
        <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="w-40" />
      </div>
      <Button onClick={() => setUsdIdrRate(Number(value) || usdIdrRate)}>Save rate</Button>
    </div>
  );
}
