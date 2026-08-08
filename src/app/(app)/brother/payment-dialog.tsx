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
import { addContractorPayment } from "./actions";

interface RecentIncome {
  id: string;
  date: string;
  description: string | null;
  amount_idr: number;
}

export function PaymentDialog({ recentIncome }: { recentIncome: RecentIncome[] }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [money, setMoney] = useState<MoneyValue>(emptyMoneyValue());
  const [notes, setNotes] = useState("");
  const [relatedIncomeId, setRelatedIncomeId] = useState<string>("none");
  const router = useRouter();

  async function handleSave() {
    if (!money.amount) {
      toast.error("Amount is required");
      return;
    }
    setSaving(true);
    try {
      await addContractorPayment({
        date,
        payee: "Brother",
        amount: Number(money.amount),
        currency: money.currency,
        fx_rate: money.currency === "IDR" ? 1 : Number(money.fxRate) || 1,
        amount_idr: moneyValueToIdr(money),
        related_income_transaction_id: relatedIncomeId === "none" ? null : relatedIncomeId,
        notes: notes || null,
      });
      toast.success("Payment logged");
      setMoney(emptyMoneyValue());
      setNotes("");
      setRelatedIncomeId("none");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">+ Log payment</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log payment to brother</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <MoneyInput value={money} onChange={setMoney} />

          <div className="flex flex-col gap-2">
            <Label>Related income (optional)</Label>
            <Select value={relatedIncomeId} onValueChange={(v) => setRelatedIncomeId(v ?? "none")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not tied to a specific client payment</SelectItem>
                {recentIncome.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.date} — {i.description ?? "income"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What this payment was for"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Log payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
