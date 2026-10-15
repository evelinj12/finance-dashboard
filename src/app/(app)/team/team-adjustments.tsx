"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Money } from "@/components/money";
import { todayStr } from "@/lib/dates";
import { remainingAdjustment, type PayoutAdjustment, type AdjustmentSettlement } from "@/lib/team-adjustments";
import { manageTeamAdjustment } from "./actions";

export interface SharedExpenseOption { id: string; date: string; notes: string | null; amount_idr: number }

export function TeamAdjustments({ members, adjustments, settlements, expenses }: {
  members: { id: string; name: string }[]; adjustments: PayoutAdjustment[];
  settlements: AdjustmentSettlement[]; expenses: SharedExpenseOption[];
}) {
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [date, setDate] = useState(todayStr());
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseId, setExpenseId] = useState("none");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const memberItems = members.map((row) => ({ value: row.id, label: row.name }));
  async function run(operation: "add" | "repay" | "delete", id: string, rowMemberId: string, rowAmount: number, rowDate: string) {
    setBusy(true);
    try {
      await manageTeamAdjustment({ operation, id, memberId: rowMemberId, date: rowDate,
        amount: rowAmount, reason, expenseId: expenseId === "none" ? null : expenseId, requestId: crypto.randomUUID() });
      if (operation === "add") { setReason(""); setAmount(""); setExpenseId("none"); }
      toast.success(operation === "repay" ? "Repayment recorded" : operation === "delete" ? "Adjustment removed" : "Deduction added");
      router.refresh();
      return true;
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save adjustment"); return false; }
    finally { setBusy(false); }
  }
  return (
    <Card>
      <CardHeader><CardTitle>Payout adjustments</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(event) => {
          event.preventDefault(); void run("add", crypto.randomUUID(), memberId, Number(amount), date);
        }}>
          <div className="space-y-2"><Label htmlFor="adjustment-member">Team member</Label>
            <Select items={memberItems} value={memberId} onValueChange={(value) => setMemberId(value ?? "")}>
              <SelectTrigger id="adjustment-member" className="w-full"><SelectValue placeholder="Choose member" /></SelectTrigger>
              <SelectContent>{members.map((row) => <SelectItem key={row.id} value={row.id}>{row.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="adjustment-date">Date</Label>
            <Input id="adjustment-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="adjustment-amount">Deduction (IDR)</Label>
            <Input id="adjustment-amount" type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="adjustment-reason">Reason</Label>
            <Input id="adjustment-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Share of Sister's gift" required /></div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-3"><Label htmlFor="adjustment-expense">Original expense (optional)</Label>
            <Select value={expenseId} onValueChange={(value) => setExpenseId(value ?? "none")}>
              <SelectTrigger id="adjustment-expense" className="w-full">
                <span className="min-w-0 truncate">{expenseId === "none" ? "No linked expense" : expenses.find((row) => row.id === expenseId)?.notes || "Selected expense"}</span>
              </SelectTrigger>
              <SelectContent><SelectItem value="none">No linked expense</SelectItem>
                {expenses.map((row) => <SelectItem key={row.id} value={row.id}>{row.date} · {row.notes || "Expense"} · Rp {row.amount_idr.toLocaleString("en-US")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="self-end" disabled={busy || !memberId}><Plus className="size-4" />Add deduction</Button>
        </form>
        <div className="divide-y border-t">
          {adjustments.length === 0 ? <p className="py-4 text-sm text-muted-foreground">No payout adjustments yet.</p> : null}
          {adjustments.map((row) => {
            const remaining = remainingAdjustment(row, settlements);
            const history = settlements.filter((item) => item.adjustment_id === row.id);
            return <div key={row.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="break-words font-medium">{row.reason}</p>
                <p className="text-sm text-muted-foreground">{members.find((member) => member.id === row.team_member_id)?.name} · {row.date}</p>
                <p className="text-sm">Deduction <Money amountIdr={row.amount_idr} /> · Outstanding <Money amountIdr={remaining} /></p>
                {history.map((item) => <p key={item.id} className="text-xs text-muted-foreground">
                  {item.settled_at} · {item.transfer_group_id ? "Deducted from payout" : "Repaid directly"} · <Money amountIdr={item.amount_idr} />
                </p>)}
                {remaining === 0 ? <p className="text-sm text-emerald-700">Settled</p> : null}
              </div>
              <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">
                {remaining > 0 ? <RepaymentForm disabled={busy} remaining={remaining} onRepay={(paidAmount, paidDate) => run("repay", row.id, row.team_member_id, paidAmount, paidDate)} /> : null}
                {history.length === 0 ? <Button size="icon-sm" variant="ghost" aria-label={`Delete ${row.reason}`} disabled={busy}
                  onClick={() => { if (confirm("Remove this deduction?")) void run("delete", row.id, row.team_member_id, 0, date); }}><Trash2 className="size-4" /></Button> : null}
              </div>
            </div>;
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function RepaymentForm({ remaining, disabled, onRepay }: { remaining: number; disabled: boolean; onRepay: (amount: number, date: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(remaining));
  const [date, setDate] = useState(todayStr());
  return open ? <form className="flex max-w-72 flex-wrap items-end gap-2" onSubmit={async (e) => { e.preventDefault(); if (await onRepay(Number(amount), date)) setOpen(false); }}>
    <div className="w-28"><Label>Amount (IDR)</Label><Input aria-label="Direct repayment amount" type="number" min="1" max={remaining} step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
    <div className="w-36"><Label>Date</Label><Input aria-label="Direct repayment date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
    <Button type="submit" size="sm" disabled={disabled}><Check className="size-4" />Record repayment</Button>
    <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
  </form> : <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Repaid directly</Button>;
}
