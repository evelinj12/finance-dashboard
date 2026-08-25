"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_USD_IDR_RATE, formatMoney } from "@/lib/currency";

export interface MoneyValue {
  amount: string;
  currency: string;
  fxRate: string;
}

export const CURRENCIES = ["IDR", "USD", "AUD"];

export function emptyMoneyValue(currency = "IDR"): MoneyValue {
  return { amount: "", currency, fxRate: currency === "IDR" ? "1" : String(DEFAULT_USD_IDR_RATE) };
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
      <div className="flex gap-2">
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
            onChange({
              ...value,
              currency,
              fxRate: currency === "IDR" ? "1" : value.fxRate === "1" ? String(DEFAULT_USD_IDR_RATE) : value.fxRate,
            });
          }}
        >
          <SelectTrigger className="w-24">
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
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0">Rate to IDR</Label>
          <Input
            type="number"
            step="any"
            className="w-32"
            value={value.fxRate}
            onChange={(e) => onChange({ ...value, fxRate: e.target.value })}
          />
          <span className="text-xs text-muted-foreground">≈ {formatMoney(idrEquivalent, "IDR")}</span>
        </div>
      ) : null}
    </div>
  );
}
