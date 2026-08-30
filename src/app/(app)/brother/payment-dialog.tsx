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
import { MoneyInput, emptyMoneyValue, type MoneyValue } from "@/components/money-input";
import { todayStr } from "@/lib/dates";
import { durationInputHint, parseDurationInput } from "@/lib/duration";
import { addContractorPayment } from "./actions";

const paymentStatuses = ["owed", "paid", "transferred", "unknown"] as const;

type PaymentStatus = (typeof paymentStatuses)[number];

function isPaymentStatus(value: string | null | undefined): value is PaymentStatus {
  return paymentStatuses.includes(value as PaymentStatus);
}

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
  const [clientOrProject, setClientOrProject] = useState("");
  const [workPeriod, setWorkPeriod] = useState("");
  const [hours, setHours] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("paid");
  const [paidAt, setPaidAt] = useState("");
  const [notes, setNotes] = useState("");
  const [relatedIncomeId, setRelatedIncomeId] = useState<string>("none");
  const router = useRouter();
  const hoursHint = durationInputHint(hours);
  const hoursInvalid = hours.trim() !== "" && hoursHint === null;

  async function handleSave() {
    const amount = Number(money.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }

    const fxRate = money.currency === "IDR" ? 1 : Number(money.fxRate);
    if (!Number.isFinite(fxRate) || fxRate <= 0) {
      toast.error("FX rate must be greater than zero");
      return;
    }

    const parsedHours = parseDurationInput(hours);
    if (hours.trim() !== "" && parsedHours === null) {
      toast.error("Hours can be 1:50, 110m, 1h 50m, or 1.83");
      return;
    }
    const normalizedHours = hours.trim() === "" ? null : parsedHours;

    setSaving(true);
    try {
      await addContractorPayment({
        date,
        payee: "Brother",
        amount,
        currency: money.currency,
        fx_rate: fxRate,
        client_or_project: clientOrProject.trim() || null,
        work_period: workPeriod.trim() || null,
        hours: normalizedHours,
        status,
        paid_at: paidAt || null,
        related_income_transaction_id: relatedIncomeId === "none" ? null : relatedIncomeId,
        notes: notes || null,
      });
      toast.success("Payment logged");
      setMoney(emptyMoneyValue());
      setClientOrProject("");
      setWorkPeriod("");
      setHours("");
      setStatus("paid");
      setPaidAt("");
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log payment to brother</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <MoneyInput value={money} onChange={setMoney} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Client / project</Label>
              <Input
                value={clientOrProject}
                onChange={(e) => setClientOrProject(e.target.value)}
                placeholder="Client or project"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Work period</Label>
              <Input
                value={workPeriod}
                onChange={(e) => setWorkPeriod(e.target.value)}
                placeholder="e.g. Jul 2026"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Hours</Label>
              <Input
                type="text"
                inputMode="text"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="1:50, 110m, 1h 50m"
                aria-invalid={hoursInvalid}
              />
              <p className={`text-xs ${hoursInvalid ? "text-destructive" : "text-muted-foreground"}`}>
                {hoursInvalid
                  ? "Use 1:50, 110m, 1h 50m, or 1.83."
                  : hoursHint
                    ? `Saved as ${hoursHint}.`
                    : "Accepts hh:mm:ss, minutes, or decimal hours."}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(isPaymentStatus(v) ? v : "unknown")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentStatuses.map((paymentStatus) => (
                    <SelectItem key={paymentStatus} value={paymentStatus}>
                      {paymentStatus}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Paid date</Label>
              <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </div>
          </div>

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
