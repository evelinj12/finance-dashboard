"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES } from "@/components/money-input";
import { defaultIdrRateForCurrency, formatMoney } from "@/lib/currency";
import { monthStart } from "@/lib/dates";
import {
  addTeamMemberRate,
  deleteTeamMemberRate,
  updateTeamMemberRate,
  type TeamMemberRateInput,
} from "./actions";

interface TeamMemberOption {
  id: string;
  name: string;
  active: boolean;
}

interface IncomeSourceOption {
  id: string;
  name: string;
  active: boolean;
}

interface RelatedName {
  name: string;
}

interface TeamMemberRate {
  id: string;
  team_member_id: string;
  income_source_id: string;
  month: string;
  hourly_rate: number;
  currency: string;
  fx_rate: number;
  active: boolean;
  notes: string | null;
  team_member: RelatedName | RelatedName[] | null;
  income_source: RelatedName | RelatedName[] | null;
}

function toMonthInputValue(month: string) {
  return month.slice(0, 7);
}

function toMonthDate(value: string) {
  return `${value}-01`;
}

function relatedName(value: RelatedName | RelatedName[] | null): string {
  if (Array.isArray(value)) return value[0]?.name ?? "-";
  return value?.name ?? "-";
}

function formatRateMonth(month: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}T00:00:00Z`)
  );
}

function rateInput({
  teamMemberId,
  sourceId,
  month,
  hourlyRate,
  currency,
  fxRate,
  active,
  notes,
}: {
  teamMemberId: string;
  sourceId: string;
  month: string;
  hourlyRate: string;
  currency: string;
  fxRate: string;
  active: boolean;
  notes: string;
}): TeamMemberRateInput {
  return {
    team_member_id: teamMemberId,
    income_source_id: sourceId,
    month: toMonthDate(month),
    hourly_rate: Number(hourlyRate),
    currency,
    fx_rate: currency === "IDR" ? 1 : Number(fxRate),
    active,
    notes: notes.trim() || null,
  };
}

export function TeamRatesSection({
  rates,
  members,
  sources,
}: {
  rates: TeamMemberRate[];
  members: TeamMemberOption[];
  sources: IncomeSourceOption[];
}) {
  const activeMembers = members.filter((member) => member.active);
  const activeSources = sources.filter((source) => source.active);
  const [teamMemberId, setTeamMemberId] = useState(activeMembers[0]?.id ?? "");
  const [sourceId, setSourceId] = useState(activeSources[0]?.id ?? "");
  const [month, setMonth] = useState(toMonthInputValue(monthStart()));
  const [hourlyRate, setHourlyRate] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [fxRate, setFxRate] = useState(String(defaultIdrRateForCurrency("USD")));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleAdd() {
    if (!teamMemberId || !sourceId || !month || !hourlyRate) {
      toast.error("Member, client, month, and rate are required");
      return;
    }

    setSaving(true);
    try {
      await addTeamMemberRate(
        rateInput({
          teamMemberId,
          sourceId,
          month,
          hourlyRate,
          currency,
          fxRate,
          active: true,
          notes,
        })
      );
      toast.success("Team rate saved");
      setHourlyRate("");
      setNotes("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save Team rate");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this Team rate? Approved entries will keep their saved amounts.")) return;

    try {
      await deleteTeamMemberRate(id);
      toast.success("Team rate deleted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete Team rate");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Rates are monthly defaults for calculating Team approvals. Once an entry is approved, its amount, currency,
        and FX rate stay locked even if this setting changes later.
      </p>

      <div className="grid gap-3 rounded-lg border border-sky-100 bg-sky-50/50 p-3 md:grid-cols-[0.8fr_1fr_0.7fr_0.65fr_0.65fr_0.8fr_1fr_auto] md:items-end">
        <div className="flex flex-col gap-2">
          <Label>Member</Label>
          <Select value={teamMemberId} onValueChange={(value) => setTeamMemberId(value ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Member" />
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
          <Select value={sourceId} onValueChange={(value) => setSourceId(value ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent>
              {activeSources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Month</Label>
          <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Hourly rate</Label>
          <Input
            type="number"
            step="any"
            min="0"
            value={hourlyRate}
            onChange={(event) => setHourlyRate(event.target.value)}
            placeholder="0"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Currency</Label>
          <Select
            value={currency}
            onValueChange={(value) => {
              if (!value) return;
              setCurrency(value);
              setFxRate(String(defaultIdrRateForCurrency(value)));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>FX to IDR</Label>
          <Input
            type="number"
            step="any"
            value={currency === "IDR" ? "1" : fxRate}
            onChange={(event) => setFxRate(event.target.value)}
            disabled={currency === "IDR"}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Notes</Label>
          <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" />
        </div>
        <Button onClick={handleAdd} disabled={saving || activeMembers.length === 0 || activeSources.length === 0}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {rates.map((rate) => (
          <TeamRateRow
            key={rate.id}
            rate={rate}
            members={members}
            sources={sources}
            onDelete={handleDelete}
          />
        ))}
        {rates.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No Team rates yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TeamRateRow({
  rate,
  members,
  sources,
  onDelete,
}: {
  rate: TeamMemberRate;
  members: TeamMemberOption[];
  sources: IncomeSourceOption[];
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [teamMemberId, setTeamMemberId] = useState(rate.team_member_id);
  const [sourceId, setSourceId] = useState(rate.income_source_id);
  const [month, setMonth] = useState(toMonthInputValue(rate.month));
  const [hourlyRate, setHourlyRate] = useState(String(rate.hourly_rate));
  const [currency, setCurrency] = useState(rate.currency);
  const [fxRate, setFxRate] = useState(String(rate.fx_rate));
  const [active, setActive] = useState(rate.active);
  const [notes, setNotes] = useState(rate.notes ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function reset() {
    setTeamMemberId(rate.team_member_id);
    setSourceId(rate.income_source_id);
    setMonth(toMonthInputValue(rate.month));
    setHourlyRate(String(rate.hourly_rate));
    setCurrency(rate.currency);
    setFxRate(String(rate.fx_rate));
    setActive(rate.active);
    setNotes(rate.notes ?? "");
    setEditing(false);
  }

  async function handleUpdate() {
    setSaving(true);
    try {
      await updateTeamMemberRate(
        rate.id,
        rateInput({
          teamMemberId,
          sourceId,
          month,
          hourlyRate,
          currency,
          fxRate,
          active,
          notes,
        })
      );
      toast.success("Team rate updated");
      setEditing(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update Team rate");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-[0.8fr_1fr_0.7fr_0.65fr_0.65fr_0.8fr_0.55fr_1fr_auto] md:items-end">
        <div className="flex flex-col gap-2">
          <Label>Member</Label>
          <Select value={teamMemberId} onValueChange={(value) => setTeamMemberId(value ?? "")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Client</Label>
          <Select value={sourceId} onValueChange={(value) => setSourceId(value ?? "")}>
            <SelectTrigger>
              <SelectValue />
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
          <Label>Month</Label>
          <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Hourly rate</Label>
          <Input type="number" step="any" min="0" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Currency</Label>
          <Select
            value={currency}
            onValueChange={(value) => {
              if (!value) return;
              setCurrency(value);
              setFxRate(String(defaultIdrRateForCurrency(value)));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>FX to IDR</Label>
          <Input
            type="number"
            step="any"
            value={currency === "IDR" ? "1" : fxRate}
            onChange={(event) => setFxRate(event.target.value)}
            disabled={currency === "IDR"}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm font-medium">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Active
        </label>
        <div className="flex flex-col gap-2">
          <Label>Notes</Label>
          <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" onClick={handleUpdate} disabled={saving} aria-label="Save Team rate">
            <Check className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={reset} aria-label="Cancel Team rate edit">
            <X className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2">
      <div>
        <div className="font-medium">
          {relatedName(rate.team_member)} · {relatedName(rate.income_source)}
        </div>
        <div className="text-sm text-muted-foreground">
          {formatRateMonth(rate.month)} · {formatMoney(rate.hourly_rate, rate.currency)}/hr · FX{" "}
          {Number(rate.fx_rate).toLocaleString("en-US")}
          {rate.active ? "" : " · inactive"}
          {rate.notes ? ` · ${rate.notes}` : ""}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Edit Team rate">
          <Pencil className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(rate.id)} aria-label="Delete Team rate">
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
