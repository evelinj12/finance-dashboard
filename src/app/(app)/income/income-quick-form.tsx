"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Save, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES, emptyMoneyValue, moneyValueToIdr, type MoneyValue } from "@/components/money-input";
import { DEFAULT_USD_IDR_RATE, formatMoney } from "@/lib/currency";
import type { IncomePaymentStatus } from "@/lib/supabase/types";
import { addIncomeTransaction, type IncomeTransactionInput } from "./actions";
import { incomePaymentStatusLabel } from "./income-summary";

interface Source {
  id: string;
  name: string;
  type: string;
}

export function IncomeQuickForm({
  sources,
  selectedMonth,
}: {
  sources: Source[];
  selectedMonth: string;
}) {
  const [sourceId, setSourceId] = useState("");
  const [date, setDate] = useState(selectedMonth);
  const [money, setMoney] = useState<MoneyValue>(emptyMoneyValue("USD"));
  const [paymentStatus, setPaymentStatus] = useState<IncomePaymentStatus>("waiting");
  const [totalHours, setTotalHours] = useState("");
  const [description, setDescription] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function resetForm() {
    setSourceId("");
    setDate(selectedMonth);
    setMoney(emptyMoneyValue("USD"));
    setPaymentStatus("waiting");
    setTotalHours("");
    setDescription("");
    setAdvancedOpen(false);
  }

  function setCurrency(currency: string | null) {
    if (!currency) return;
    setMoney((current) => ({
      ...current,
      currency,
      fxRate: currency === "IDR" ? "1" : current.fxRate === "1" ? String(DEFAULT_USD_IDR_RATE) : current.fxRate,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sourceId || !money.amount) {
      toast.error("Source and amount are required");
      return;
    }

    setSaving(true);
    const input: IncomeTransactionInput = {
      income_source_id: sourceId,
      date,
      description: description || null,
      amount: Number(money.amount),
      currency: money.currency,
      fx_rate: money.currency === "IDR" ? 1 : Number(money.fxRate) || 1,
      amount_idr: moneyValueToIdr(money),
      payment_status: paymentStatus,
      total_hours: totalHours === "" ? null : Number(totalHours),
    };

    try {
      await addIncomeTransaction(input);
      toast.success("Income added");
      resetForm();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add income");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="bg-gradient-to-br from-white to-emerald-50/70">
      <CardHeader className="border-b border-emerald-100">
        <CardTitle className="flex items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <WalletCards className="size-5" />
          </span>
          Quick income
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(130px,0.75fr)_minmax(180px,1.2fr)_minmax(160px,0.9fr)_minmax(150px,0.8fr)_minmax(120px,0.65fr)]">
            <div className="flex flex-col gap-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Client/source</Label>
              <Select value={sourceId} onValueChange={(value) => setSourceId(value ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Amount</Label>
              <Input
                type="number"
                step="any"
                placeholder="0"
                value={money.amount}
                onChange={(event) => setMoney((current) => ({ ...current, amount: event.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select
                value={paymentStatus}
                onValueChange={(value) => setPaymentStatus(value === "paid" ? "paid" : "waiting")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["waiting", "paid"] as const).map((statusOption) => (
                    <SelectItem key={statusOption} value={statusOption}>
                      {incomePaymentStatusLabel(statusOption)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Total hours</Label>
              <Input
                type="number"
                step="0.25"
                min="0"
                placeholder="0"
                value={totalHours}
                onChange={(event) => setTotalHours(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div className="flex flex-col gap-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="e.g. week period, invoice, product"
              />
            </div>
            <Button type="submit" disabled={saving} className="md:w-36">
              <Save className="size-4" />
              {saving ? "Saving..." : "Submit"}
            </Button>
          </div>

          <div className="flex flex-col gap-3 border-t border-emerald-100 pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit px-0"
              onClick={() => setAdvancedOpen((open) => !open)}
            >
              <ChevronDown className={`size-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
              Advanced
            </Button>
            {advancedOpen ? (
              <div className="grid gap-3 md:grid-cols-[120px_160px_1fr] md:items-end">
                <div className="flex flex-col gap-2">
                  <Label>Currency</Label>
                  <Select value={money.currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>FX rate</Label>
                  <Input
                    type="number"
                    step="any"
                    value={money.fxRate}
                    disabled={money.currency === "IDR"}
                    onChange={(event) => setMoney((current) => ({ ...current, fxRate: event.target.value }))}
                  />
                </div>
                <p className="pb-2 text-sm text-muted-foreground tabular-nums">
                  {formatMoney(moneyValueToIdr(money), "IDR")}
                </p>
              </div>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
