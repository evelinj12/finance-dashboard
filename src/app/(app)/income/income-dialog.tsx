"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput, emptyMoneyValue, moneyValueToIdr, type MoneyValue } from "@/components/money-input";
import { todayStr } from "@/lib/dates";
import { addIncomeTransaction, updateIncomeTransaction, type IncomeTransactionInput } from "./actions";

interface Source {
  id: string;
  name: string;
  type: string;
}

interface ExistingIncome {
  id: string;
  income_source_id: string;
  date: string;
  description: string | null;
  amount: number;
  currency: string;
  fx_rate: number;
  status: string | null;
}

export function IncomeDialog({
  sources,
  income,
  trigger,
}: {
  sources: Source[];
  income?: ExistingIncome;
  trigger: React.ReactElement;
}) {
  const isEdit = !!income;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sourceId, setSourceId] = useState(income?.income_source_id ?? "");
  const [date, setDate] = useState(income?.date ?? todayStr());
  const [description, setDescription] = useState(income?.description ?? "");
  const [money, setMoney] = useState<MoneyValue>(
    income
      ? { amount: String(income.amount), currency: income.currency, fxRate: String(income.fx_rate) }
      : emptyMoneyValue("USD")
  );
  const [status, setStatus] = useState(income?.status ?? "SUCCESS");
  const router = useRouter();

  async function handleSave() {
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
      status: status || null,
    };
    try {
      if (isEdit) {
        await updateIncomeTransaction(income.id, input);
        toast.success("Income updated");
      } else {
        await addIncomeTransaction(input);
        toast.success("Income added");
        setMoney(emptyMoneyValue("USD"));
        setDescription("");
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save income");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit income" : "Add income"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Source</Label>
            <Select value={sourceId} onValueChange={(v) => setSourceId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {sources.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <MoneyInput value={money} onChange={setMoney} />

          <div className="flex flex-col gap-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. week period, product name"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Status</Label>
            <Input value={status} onChange={(e) => setStatus(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Add income"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
