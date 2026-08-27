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
import { addTransaction, updateTransaction, type TransactionInput } from "./actions";

interface Category {
  id: string;
  name: string;
  tag: string;
}

interface ExistingTransaction {
  id: string;
  date: string;
  category_id: string;
  direction: "in" | "out";
  amount: number;
  currency: string;
  fx_rate: number;
  notes: string | null;
  save_to: string | null;
}

const tagLabels: Record<string, string> = {
  income: "Income",
  sinking_fund: "Sinking Fund",
  fixed: "Fixed",
  spent: "Spent",
};

export function TransactionDialog({
  categories,
  transaction,
  trigger,
}: {
  categories: Category[];
  transaction?: ExistingTransaction;
  trigger: React.ReactElement;
}) {
  const isEdit = !!transaction;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(transaction?.date ?? todayStr());
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? "");
  const [direction, setDirection] = useState<"in" | "out">(transaction?.direction ?? "out");
  const [money, setMoney] = useState<MoneyValue>(
    transaction
      ? {
          amount: String(transaction.amount),
          currency: transaction.currency,
          fxRate: String(transaction.fx_rate),
        }
      : emptyMoneyValue()
  );
  const [notes, setNotes] = useState(transaction?.notes ?? "");
  const [saveTo, setSaveTo] = useState(transaction?.save_to ?? "");
  const router = useRouter();
  const categoryItems = categories.map((category) => ({
    value: category.id,
    label: `${category.name} - ${tagLabels[category.tag] ?? category.tag}`,
  }));

  async function handleSave() {
    if (!categoryId || !money.amount) {
      toast.error("Category and amount are required");
      return;
    }
    setSaving(true);
    const input: TransactionInput = {
      date,
      category_id: categoryId,
      direction,
      amount: Number(money.amount),
      currency: money.currency,
      fx_rate: money.currency === "IDR" ? 1 : Number(money.fxRate) || 1,
      amount_idr: moneyValueToIdr(money),
      notes: notes || null,
      save_to: saveTo || null,
    };
    try {
      if (isEdit) {
        await updateTransaction(transaction.id, input);
        toast.success("Transaction updated");
      } else {
        await addTransaction(input);
        toast.success("Transaction added");
        setMoney(emptyMoneyValue());
        setNotes("");
        setSaveTo("");
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save transaction");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit transaction" : "Add transaction"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Direction</Label>
              <Select value={direction} onValueChange={(v) => v && setDirection(v as "in" | "out")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="out">Out (expense)</SelectItem>
                  <SelectItem value="in">In (income/refund)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Category</Label>
            <Select items={categoryItems} value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} - {tagLabels[c.tag] ?? c.tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <MoneyInput value={money} onChange={setMoney} />

          <div className="flex flex-col gap-2">
            <Label>Save to (for sinking fund contributions)</Label>
            <Input value={saveTo} onChange={(e) => setSaveTo(e.target.value)} placeholder="e.g. pasar uang" />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Add transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
