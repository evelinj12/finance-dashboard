"use client";

import { Fragment, useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DurationDisplay } from "@/components/duration-display";
import { Money } from "@/components/money";
import { CURRENCIES } from "@/components/money-input";
import { defaultIdrRateForCurrency, formatMoney } from "@/lib/currency";
import type { TeamWorkStatus } from "@/lib/supabase/types";
import { calculateTeamAmount, monthFromDate } from "@/lib/team-rates";
import { applyTeamRateToEntries, bulkApproveTeamWorkEntries } from "./actions";
import { DeleteTeamWorkButton } from "./delete-team-work-button";
import { TeamWorkDialog } from "./team-work-dialog";

const statusLabels: Record<TeamWorkStatus, string> = {
  need_approval: "Need approval",
  owed: "Owed",
  paid: "Paid",
};

const statusBadgeVariant = {
  need_approval: "outline",
  owed: "destructive",
  paid: "secondary",
} as const;

interface RelatedName {
  name: string;
  type?: string;
}

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

interface TeamWorkEntry {
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
  amount_idr: number;
  status: TeamWorkStatus;
  paid_at: string | null;
  notes: string | null;
  team_member: RelatedName | RelatedName[] | null;
  income_source: RelatedName | RelatedName[] | null;
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
}

interface TeamAmountDisplay {
  amount: number;
  currency: string;
  fxRate: number;
  amountIdr: number;
  suggested: boolean;
  missingRate: boolean;
}

interface GroupedTeamEntries {
  key: string;
  name: string;
  entries: TeamWorkEntry[];
  subtotalIdr: number;
  hours: number;
  originalCurrencySummary: string;
  missingRateCount: number;
}

function relatedName(value: RelatedName | RelatedName[] | null): string {
  if (Array.isArray(value)) return value[0]?.name ?? "-";
  return value?.name ?? "-";
}

function relatedType(value: RelatedName | RelatedName[] | null): string | undefined {
  if (Array.isArray(value)) return value[0]?.type;
  return value?.type;
}

function entrySourceOption(entry: TeamWorkEntry, sources: IncomeSourceOption[]) {
  if (!entry.income_source_id || sources.some((source) => source.id === entry.income_source_id)) {
    return sources;
  }

  if (relatedType(entry.income_source) !== "freelance_client") return sources;

  return [
    ...sources,
    {
      id: entry.income_source_id,
      name: relatedName(entry.income_source),
      type: "freelance_client",
    },
  ];
}

function rateKey(teamMemberId: string, incomeSourceId: string, month: string) {
  return `${teamMemberId}:${incomeSourceId}:${month}`;
}

function amountForEntry(entry: TeamWorkEntry, rateByKey: Map<string, TeamMemberRate>): TeamAmountDisplay {
  if (entry.status === "need_approval" && Number(entry.amount_idr) === 0) {
    const rate = entry.income_source_id
      ? rateByKey.get(rateKey(entry.team_member_id, entry.income_source_id, monthFromDate(entry.date)))
      : undefined;
    const calculated = rate?.active ? calculateTeamAmount(entry.hours, rate) : null;

    if (calculated) {
      return { ...calculated, suggested: true, missingRate: false };
    }

    return {
      amount: 0,
      currency: "IDR",
      fxRate: 1,
      amountIdr: 0,
      suggested: true,
      missingRate: true,
    };
  }

  return {
    amount: Number(entry.amount),
    currency: entry.currency,
    fxRate: Number(entry.fx_rate),
    amountIdr: Number(entry.amount_idr),
    suggested: false,
    missingRate: false,
  };
}

function summarizeOriginalCurrencies(amounts: TeamAmountDisplay[]) {
  const totals = new Map<string, number>();

  for (const amount of amounts) {
    if (amount.missingRate) continue;
    totals.set(amount.currency, (totals.get(amount.currency) ?? 0) + amount.amount);
  }

  return Array.from(totals.entries())
    .filter(([currency]) => currency !== "IDR")
    .map(([currency, amount]) => formatMoney(amount, currency))
    .join(" + ");
}

function firstSavedRate(group: GroupedTeamEntries, rates: TeamMemberRate[]) {
  for (const entry of group.entries) {
    if (!entry.income_source_id) continue;
    const rate = rates.find(
      (item) =>
        item.active &&
        item.team_member_id === entry.team_member_id &&
        item.income_source_id === entry.income_source_id &&
        item.month === monthFromDate(entry.date)
    );
    if (rate) return rate;
  }

  return null;
}

function inferredRateFromEntries(group: GroupedTeamEntries) {
  const entry = group.entries.find((item) => item.hours && item.hours > 0 && Number(item.amount) > 0);
  if (!entry?.hours) return null;

  return {
    hourly_rate: Math.round((Number(entry.amount) / entry.hours) * 100) / 100,
    currency: entry.currency,
    fx_rate: Number(entry.fx_rate),
  };
}

function ClientSubtotalControls({
  group,
  rates,
  selectedIds,
  fallbackIds,
  onApplied,
}: {
  group: GroupedTeamEntries;
  rates: TeamMemberRate[];
  selectedIds: string[];
  fallbackIds: string[];
  onApplied: () => void;
}) {
  const router = useRouter();
  const savedRate = firstSavedRate(group, rates);
  const inferredRate = savedRate ?? inferredRateFromEntries(group);
  const [hourlyRate, setHourlyRate] = useState(
    inferredRate?.hourly_rate ? String(inferredRate.hourly_rate) : ""
  );
  const [currency, setCurrency] = useState(inferredRate?.currency ?? "USD");
  const [fxRate, setFxRate] = useState(String(inferredRate?.fx_rate ?? defaultIdrRateForCurrency("USD")));
  const [saving, setSaving] = useState(false);
  const targetIds = selectedIds.length > 0 ? selectedIds : fallbackIds;
  const targetLabel = selectedIds.length > 0 ? `selected (${selectedIds.length})` : "client";

  async function handleApplyRate() {
    if (targetIds.length === 0) {
      toast.error("No editable entries in this client group.");
      return;
    }
    if (!hourlyRate) {
      toast.error("Add an hourly rate first.");
      return;
    }

    setSaving(true);
    try {
      const result = await applyTeamRateToEntries({
        entry_ids: targetIds,
        hourly_rate: Number(hourlyRate),
        currency,
        fx_rate: currency === "IDR" ? 1 : Number(fxRate),
      });
      toast.success(`${result.updatedCount} ${result.updatedCount === 1 ? "entry" : "entries"} recalculated`);
      onApplied();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply rate");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-semibold">Subtotal</span>
        <DurationDisplay hours={group.hours} />
        <div className="flex flex-col">
          <Money amountIdr={group.subtotalIdr} className="font-semibold" />
          {group.originalCurrencySummary ? (
            <span className="text-xs font-normal text-muted-foreground">{group.originalCurrencySummary}</span>
          ) : null}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-[minmax(7rem,0.8fr)_5.5rem_minmax(7rem,0.8fr)_auto] sm:items-center">
        <Input
          type="number"
          step="any"
          min="0"
          value={hourlyRate}
          onChange={(event) => setHourlyRate(event.target.value)}
          placeholder="Hourly rate"
          aria-label={`Hourly rate for ${group.name}`}
          className="h-9"
        />
        <Select
          value={currency}
          onValueChange={(value) => {
            if (!value) return;
            setCurrency(value);
            setFxRate(String(defaultIdrRateForCurrency(value)));
          }}
        >
          <SelectTrigger className="h-9">
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
        <Input
          type="number"
          step="any"
          value={currency === "IDR" ? "1" : fxRate}
          onChange={(event) => setFxRate(event.target.value)}
          disabled={currency === "IDR"}
          aria-label={`FX rate for ${group.name}`}
          className="h-9"
        />
        <Button type="button" size="sm" onClick={handleApplyRate} disabled={saving || targetIds.length === 0}>
          {saving ? "Applying..." : `Apply to ${targetLabel}`}
        </Button>
      </div>
    </div>
  );
}

export function TeamWorkEntriesTable({
  entries,
  members,
  sources,
  rates,
}: {
  entries: TeamWorkEntry[];
  members: TeamMemberOption[];
  sources: IncomeSourceOption[];
  rates: TeamMemberRate[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [approving, setApproving] = useState(false);
  const adjustableIds = entries.filter((entry) => entry.status !== "paid").map((entry) => entry.id);
  const approvableIds = entries.filter((entry) => entry.status === "need_approval").map((entry) => entry.id);
  const selectedAdjustableIds = selectedIds.filter((id) => adjustableIds.includes(id));
  const selectedApprovableIds = selectedIds.filter((id) => approvableIds.includes(id));
  const allAdjustableSelected = adjustableIds.length > 0 && selectedAdjustableIds.length === adjustableIds.length;
  const rateByKey = useMemo(
    () => new Map(rates.map((rate) => [rateKey(rate.team_member_id, rate.income_source_id, rate.month), rate])),
    [rates]
  );
  const groupedEntries = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        name: string;
        entries: TeamWorkEntry[];
        subtotalIdr: number;
        hours: number;
        originalCurrencySummary: string;
        missingRateCount: number;
      }
    >();

    for (const entry of entries) {
      const key = entry.income_source_id ?? "unassigned";
      const name = entry.income_source_id ? relatedName(entry.income_source) : "No client";
      const current =
        groups.get(key) ??
        {
          key,
          name,
          entries: [],
          subtotalIdr: 0,
          hours: 0,
          originalCurrencySummary: "",
          missingRateCount: 0,
        };
      current.entries.push(entry);
      groups.set(key, current);
    }

    return Array.from(groups.values()).map((group) => {
      const amounts = group.entries.map((entry) => amountForEntry(entry, rateByKey));
      return {
        ...group,
        subtotalIdr: amounts.reduce((sum, amount) => sum + amount.amountIdr, 0),
        hours: group.entries.reduce((sum, entry) => sum + (entry.hours ?? 0), 0),
        originalCurrencySummary: summarizeOriginalCurrencies(amounts),
        missingRateCount: amounts.filter((amount) => amount.missingRate).length,
      };
    });
  }, [entries, rateByKey]);

  function toggleEntry(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function selectGroup(ids: string[]) {
    setSelectedIds((current) => Array.from(new Set([...current, ...ids])));
  }

  function clearGroup(ids: string[]) {
    setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
  }

  async function handleApproveSelected() {
    if (selectedApprovableIds.length === 0) {
      toast.error("Choose at least one entry waiting for approval.");
      return;
    }

    setApproving(true);
    try {
      const result = await bulkApproveTeamWorkEntries(selectedApprovableIds);
      toast.success(`${result.approvedCount} ${result.approvedCount === 1 ? "entry" : "entries"} approved`);
      setSelectedIds([]);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve selected entries");
    } finally {
      setApproving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Team work entries</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {approvableIds.length > 0 ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedIds(approvableIds)}>
                Select all pending
              </Button>
              {selectedIds.length > 0 ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                  Clear
                </Button>
              ) : null}
              <Button type="button" size="sm" onClick={handleApproveSelected} disabled={approving || selectedApprovableIds.length === 0}>
                {approving ? "Approving..." : `Approve selected${selectedApprovableIds.length > 0 ? ` (${selectedApprovableIds.length})` : ""}`}
              </Button>
            </>
          ) : null}
          <TeamWorkDialog
            members={members}
            sources={sources}
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Entry
              </Button>
            }
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  aria-label="Select all entries waiting for approval"
                  checked={allAdjustableSelected}
                  disabled={adjustableIds.length === 0}
                  onChange={(event) => setSelectedIds(event.target.checked ? adjustableIds : [])}
                  className="size-4 rounded border-sky-300 text-primary accent-primary disabled:opacity-40"
                />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Work period</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Paid at</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="sticky right-0 z-10 w-24 bg-sky-50/95 text-right shadow-[-10px_0_16px_-16px_rgba(15,47,85,0.45)]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedEntries.map((group) => {
              const groupAdjustableIds = group.entries
                .filter((entry) => entry.status !== "paid")
                .map((entry) => entry.id);
              const selectedGroupIds = selectedIds.filter((id) => groupAdjustableIds.includes(id));
              const allGroupSelected =
                groupAdjustableIds.length > 0 && selectedGroupIds.length === groupAdjustableIds.length;
              return (
                <Fragment key={group.key}>
                  <TableRow key={`${group.key}-header`} className="bg-sky-50/80 hover:bg-sky-50">
                    <TableCell colSpan={12} className="py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="font-semibold uppercase tracking-wide text-primary">{group.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {group.entries.length} {group.entries.length === 1 ? "entry" : "entries"}
                          </span>
                          {group.missingRateCount > 0 ? (
                            <Badge variant="destructive">{group.missingRateCount} missing rate</Badge>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {groupAdjustableIds.length > 0 ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                allGroupSelected ? clearGroup(groupAdjustableIds) : selectGroup(groupAdjustableIds)
                              }
                            >
                              {allGroupSelected ? "Clear client" : "Select all"}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                  {group.entries.map((entry) => {
                    const canSelect = entry.status !== "paid";
                    const selected = selectedIds.includes(entry.id);
                    const amount = amountForEntry(entry, rateByKey);
                    return (
                      <TableRow key={entry.id} data-state={selected ? "selected" : undefined}>
                        <TableCell>
                          <input
                            type="checkbox"
                            aria-label={`Select ${relatedName(entry.team_member)} work entry from ${entry.date}`}
                            checked={selected}
                            disabled={!canSelect}
                            onChange={() => toggleEntry(entry.id)}
                            className="size-4 rounded border-sky-300 text-primary accent-primary disabled:opacity-30"
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{entry.date}</TableCell>
                        <TableCell>{relatedName(entry.team_member)}</TableCell>
                        <TableCell>{relatedName(entry.income_source)}</TableCell>
                        <TableCell className="text-muted-foreground">{entry.description ?? "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{entry.work_period ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          <DurationDisplay hours={entry.hours} />
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant[entry.status]}>{statusLabels[entry.status]}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {amount.missingRate ? (
                            <Badge variant="destructive">Missing rate</Badge>
                          ) : (
                            <div className="flex flex-col items-end gap-1">
                              <Money amountIdr={amount.amountIdr} />
                              <span className="text-xs text-muted-foreground">
                                {amount.suggested ? "Suggested " : ""}
                                {formatMoney(amount.amount, amount.currency)}
                                {amount.currency !== "IDR" ? ` @ ${amount.fxRate.toLocaleString("en-US")}` : ""}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{entry.paid_at ?? "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{entry.notes ?? "-"}</TableCell>
                        <TableCell className="sticky right-0 z-10 bg-white/95 shadow-[-10px_0_16px_-16px_rgba(15,47,85,0.45)]">
                          <div className="flex items-center justify-end gap-1">
                            <TeamWorkDialog
                              members={members}
                              sources={entrySourceOption(entry, sources)}
                              entry={entry}
                              trigger={
                                <Button variant="ghost" size="icon-sm" aria-label="Edit team work entry">
                                  <Pencil className="size-4" />
                                </Button>
                              }
                            />
                            <DeleteTeamWorkButton id={entry.id} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow key={`${group.key}-subtotal`} className="bg-muted/30 font-medium hover:bg-muted/30">
                    <TableCell colSpan={12}>
                      <ClientSubtotalControls
                        group={group}
                        rates={rates}
                        selectedIds={selectedGroupIds}
                        fallbackIds={groupAdjustableIds}
                        onApplied={() => setSelectedIds([])}
                      />
                    </TableCell>
                  </TableRow>
                </Fragment>
              );
            })}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="py-8 text-center text-muted-foreground">
                  No team work logged this month yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
