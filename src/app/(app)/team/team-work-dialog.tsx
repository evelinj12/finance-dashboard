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
import type { TeamWorkStatus } from "@/lib/supabase/types";
import { addTeamWorkEntry, updateTeamWorkEntry, type TeamWorkEntryInput } from "./actions";

interface TeamMemberOption {
  id: string;
  name: string;
  active: boolean;
  default_currency: string;
}

interface IncomeSourceOption {
  id: string;
  name: string;
  type: string;
}

interface ExistingTeamWorkEntry {
  id: string;
  team_member_id: string;
  income_source_id: string | null;
  date: string;
  description: string | null;
  work_period: string | null;
  hours: number | null;
  amount: number;
  currency: string;
  fx_rate: number;
  status: TeamWorkStatus;
  paid_at: string | null;
  notes: string | null;
}

const statusOptions: TeamWorkStatus[] = ["owed", "paid"];

export function TeamWorkDialog({
  members,
  sources,
  entry,
  trigger,
}: {
  members: TeamMemberOption[];
  sources: IncomeSourceOption[];
  entry?: ExistingTeamWorkEntry;
  trigger: React.ReactElement;
}) {
  const isEdit = !!entry;
  const activeMembers = members.filter((member) => member.active || member.id === entry?.team_member_id);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [memberId, setMemberId] = useState(entry?.team_member_id ?? activeMembers[0]?.id ?? "");
  const [sourceId, setSourceId] = useState(entry?.income_source_id ?? "none");
  const [date, setDate] = useState(entry?.date ?? todayStr());
  const [description, setDescription] = useState(entry?.description ?? "");
  const [workPeriod, setWorkPeriod] = useState(entry?.work_period ?? "");
  const [hours, setHours] = useState(entry?.hours === null || entry?.hours === undefined ? "" : String(entry.hours));
  const [money, setMoney] = useState<MoneyValue>(
    entry
      ? { amount: String(entry.amount), currency: entry.currency, fxRate: String(entry.fx_rate) }
      : emptyMoneyValue(activeMembers[0]?.default_currency ?? "IDR")
  );
  const [status, setStatus] = useState<TeamWorkStatus>(entry?.status ?? "owed");
  const [paidAt, setPaidAt] = useState(entry?.paid_at ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const router = useRouter();
  const memberItems = activeMembers.map((member) => ({ value: member.id, label: member.name }));
  const sourceItems = [
    { value: "none", label: "No client" },
    ...sources.map((source) => ({ value: source.id, label: source.name })),
  ];

  function buildInput(): TeamWorkEntryInput | null {
    const amount = Number(money.amount);
    const fxRate = money.currency === "IDR" ? 1 : Number(money.fxRate);
    const parsedHours = Number(hours);

    if (!memberId) {
      toast.error("Team member is required");
      return null;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Amount must be greater than zero");
      return null;
    }
    if (!Number.isFinite(fxRate) || fxRate <= 0) {
      toast.error("FX rate must be greater than zero");
      return null;
    }
    if (hours.trim() !== "" && (!Number.isFinite(parsedHours) || parsedHours < 0)) {
      toast.error("Hours must be zero or greater");
      return null;
    }

    return {
      team_member_id: memberId,
      income_source_id: sourceId === "none" ? null : sourceId,
      date,
      description: description.trim() || null,
      work_period: workPeriod.trim() || null,
      hours: hours.trim() === "" ? null : parsedHours,
      amount,
      currency: money.currency,
      fx_rate: fxRate,
      status,
      paid_at: paidAt || null,
      notes: notes.trim() || null,
    };
  }

  async function handleSave() {
    const input = buildInput();
    if (!input) return;

    setSaving(true);
    try {
      if (isEdit) {
        await updateTeamWorkEntry(entry.id, input);
        toast.success("Team work updated");
      } else {
        await addTeamWorkEntry(input);
        toast.success("Team work logged");
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save team work");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit team work" : "Log team work"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label>Member</Label>
              <Select items={memberItems} value={memberId} onValueChange={(value) => setMemberId(value ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {activeMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Client</Label>
              <Select items={sourceItems} value={sourceId} onValueChange={(value) => setSourceId(value ?? "none")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {sources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
          </div>

          <MoneyInput value={money} onChange={setMoney} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Description</Label>
              <Input value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Work period</Label>
              <Input value={workPeriod} onChange={(event) => setWorkPeriod(event.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label>Hours</Label>
              <Input type="number" min="0" step="any" value={hours} onChange={(event) => setHours(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value === "paid" ? "paid" : "owed")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Paid date</Label>
              <Input type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} disabled={status !== "paid"} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving || activeMembers.length === 0}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Log team work"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
