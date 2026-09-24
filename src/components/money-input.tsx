"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { defaultIdrRateForCurrency, formatMoney } from "@/lib/currency";

export interface MoneyValue {
  amount: string;
  currency: string;
  fxRate: string;
}

export const CURRENCIES = ["IDR", "USD", "AUD"];

export function emptyMoneyValue(currency = "IDR"): MoneyValue {
  return { amount: "", currency, fxRate: String(defaultIdrRateForCurrency(currency)) };
}

export function moneyValueToIdr(v: MoneyValue): number {
  const amount = Number(v.amount) || 0;
  const rate = v.currency === "IDR" ? 1 : Number(v.fxRate) || 0;
  return Math.round(amount * rate);
}

export function MoneyInput({
  value,
  onChange,
  label = "Amount",
}: {
  value: MoneyValue;
  onChange: (v: MoneyValue) => void;
  label?: string;
}) {
  const idrEquivalent = moneyValueToIdr(value);

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="flex min-w-0 gap-2">
        <Input
          type="number"
          step="any"
          placeholder="0"
          className="flex-1"
          value={value.amount}
          onChange={(e) => onChange({ ...value, amount: e.target.value })}
        />
        <Select
          value={value.currency}
          onValueChange={(currency) => {
            if (!currency) return;
            const currentDefaultRate = String(defaultIdrRateForCurrency(value.currency));
            const nextDefaultRate = String(defaultIdrRateForCurrency(currency));
            onChange({
              ...value,
              currency,
              fxRate:
                value.fxRate === "1" || value.fxRate === currentDefaultRate ? nextDefaultRate : value.fxRate,
            });
          }}
        >
          <SelectTrigger className="w-24 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {value.currency !== "IDR" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Label className="shrink-0 text-xs text-muted-foreground">Rate to IDR</Label>
          <Input
            type="number"
            step="any"
            className="w-32 min-w-0"
            value={value.fxRate}
            onChange={(e) => onChange({ ...value, fxRate: e.target.value })}
          />
          <span className="text-xs text-muted-foreground">≈ {formatMoney(idrEquivalent, "IDR")}</span>
        </div>
      ) : null}
    </div>
  );
}
