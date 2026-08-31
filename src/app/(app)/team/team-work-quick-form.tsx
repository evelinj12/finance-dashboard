"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput, emptyMoneyValue, type MoneyValue } from "@/components/money-input";
import { durationInputHint, parseDurationInput } from "@/lib/duration";
import type { TeamWorkStatus } from "@/lib/supabase/types";
import { addTeamWorkEntry, type TeamWorkEntryInput } from "./actions";

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

const statusOptions: TeamWorkStatus[] = ["owed", "paid"];

export function TeamWorkQuickForm({
  members,
  sources,
  selectedMonth,
}: {
  members: TeamMemberOption[];
  sources: IncomeSourceOption[];
  selectedMonth: string;
}) {
  const activeMembers = useMemo(() => members.filter((member) => member.active), [members]);
  const [memberId, setMemberId] = useState(activeMembers[0]?.id ?? "");
  const [sourceId, setSourceId] = useState("none");
  const [date, setDate] = useState(selectedMonth);
  const [description, setDescription] = useState("");
  const [workPeriod, setWorkPeriod] = useState("");
  const [hours, setHours] = useState("");
  const [money, setMoney] = useState<MoneyValue>(emptyMoneyValue(activeMembers[0]?.default_currency ?? "IDR"));
  const [status, setStatus] = useState<"owed" | "paid">("owed");
  const [paidAt, setPaidAt] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const memberItems = activeMembers.map((member) => ({ value: member.id, label: member.name }));
  const sourceItems = [
    { value: "none", label: "No client" },
    ...sources.map((source) => ({ value: source.id, label: source.name })),
  ];
  const hoursHint = durationInputHint(hours);
  const hoursInvalid = hours.trim() !== "" && hoursHint === null;

  function buildInput(): TeamWorkEntryInput | null {
    const amount = Number(money.amount);
    const fxRate = money.currency === "IDR" ? 1 : Number(money.fxRate);
    const parsedHours = parseDurationInput(hours);

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
    if (hours.trim() !== "" && parsedHours === null) {
      toast.error("Hours can be 1:50, 110m, 1h 50m, or 1.83");
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
      await addTeamWorkEntry(input);
      toast.success("Team work logged");
      setSourceId("none");
      setDescription("");
      setWorkPeriod("");
      setHours("");
      setMoney(emptyMoneyValue(money.currency));
      setStatus("owed");
      setDate(selectedMonth);
      setPaidAt("");
      setNotes("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log team work");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="bg-gradient-to-br from-white to-orange-50/70">
      <CardHeader className="border-b border-orange-100">
        <CardTitle className="flex items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
            <Users className="size-5" />
          </span>
          Log team work
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-3">
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

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Description</Label>
            <Input value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Work period</Label>
            <Input value={workPeriod} onChange={(event) => setWorkPeriod(event.target.value)} placeholder="e.g. Aug week 1" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="flex flex-col gap-2">
            <Label>Hours</Label>
            <Input
              type="text"
              inputMode="text"
              value={hours}
              onChange={(event) => setHours(event.target.value)}
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
          <MoneyInput value={money} onChange={setMoney} />
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

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || activeMembers.length === 0}>
            <Save className="size-4" />
            {saving ? "Saving..." : "Log team work"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
