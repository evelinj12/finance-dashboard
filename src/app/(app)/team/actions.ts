"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { monthRange } from "@/lib/dates";
import { calculateTeamAmount, monthFromDate } from "@/lib/team-rates";
import type { TeamTransferStatus, TeamWorkStatus } from "@/lib/supabase/types";

const teamWorkStatuses = ["need_approval", "owed", "paid"] as const;
const teamTransferStatuses = ["not_transferred", "transferred"] as const;
const teamRevalidatePaths = ["/team", "/income", "/transactions", "/budget", "/saving-health", "/"];
const monthPattern = /^\d{4}-\d{2}-01$/;

function isTeamWorkStatus(value: string): value is TeamWorkStatus {
  return teamWorkStatuses.includes(value as TeamWorkStatus);
}

function isTeamTransferStatus(value: string): value is TeamTransferStatus {
  return teamTransferStatuses.includes(value as TeamTransferStatus);
}

function revalidateTeamPaths() {
  for (const path of teamRevalidatePaths) {
    revalidatePath(path);
  }
}

export interface TeamWorkEntryInput {
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

export interface TeamMemberInput {
  name: string;
  default_currency: string;
  notes: string | null;
  active: boolean;
  access_email: string | null;
  access_active: boolean;
}

export interface TeamTransferInput {
  month: string;
  team_member_id: string;
  status: TeamTransferStatus;
  transferred_at: string | null;
  notes: string | null;
}

export interface TeamRateApplyInput {
  entry_ids: string[];
  hourly_rate: number;
  currency: string;
  fx_rate: number;
}

export interface TeamBulkStatusInput {
  entry_ids: string[];
  status: TeamWorkStatus;
  paid_at: string | null;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function validateTeamWorkEntry(input: TeamWorkEntryInput) {
  if (!input.team_member_id) {
    throw new Error("Team member is required");
  }
  if (!input.date) {
    throw new Error("Date is required");
  }
  if (!Number.isFinite(input.amount) || (input.status !== "need_approval" && input.amount === 0)) {
    throw new Error("Amount cannot be zero");
  }
  if (!Number.isFinite(input.fx_rate) || input.fx_rate <= 0) {
    throw new Error("FX rate must be greater than zero");
  }
  if (input.hours !== null && (!Number.isFinite(input.hours) || input.hours < 0)) {
    throw new Error("Hours must be zero or greater");
  }
  if (!isTeamWorkStatus(input.status)) {
    throw new Error("Invalid team work status");
  }
}

function normalizeTeamWorkEntry(input: TeamWorkEntryInput) {
  validateTeamWorkEntry(input);
  const amountIdr = Math.round(input.amount * input.fx_rate);
  if (!Number.isFinite(amountIdr) || (input.status !== "need_approval" && amountIdr === 0)) {
    throw new Error("Amount in IDR cannot be zero");
  }

  return {
    ...input,
    description: input.description?.trim() || null,
    work_period: input.work_period?.trim() || null,
    currency: input.currency.trim() || "IDR",
    amount_idr: amountIdr,
    paid_at: input.status === "paid" ? input.paid_at : null,
    transfer_group_id: input.status === "paid" ? undefined : null,
    notes: input.notes?.trim() || null,
  };
}

function normalizeTeamMember(input: TeamMemberInput) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Team member name is required");
  }

  return {
    name,
    active: input.active,
    default_currency: input.default_currency.trim() || "IDR",
    notes: input.notes?.trim() || null,
  };
}

function normalizeAccessEmail(email: string | null | undefined) {
  const trimmed = email?.trim().toLowerCase() ?? "";
  return trimmed || null;
}

async function upsertTeamMemberAccess(supabase: SupabaseServerClient, teamMemberId: string, input: TeamMemberInput) {
  const email = normalizeAccessEmail(input.access_email);
  const { data: existing, error: existingError } = await supabase
    .from("team_member_access")
    .select("id, user_id")
    .eq("team_member_id", teamMemberId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (!email) {
    if (existing) {
      const { error } = await supabase
        .from("team_member_access")
        .update({ email: null, active: false, notes: "Team access disabled from dashboard." })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    }
    return;
  }

  const payload = {
    team_member_id: teamMemberId,
    email,
    active: input.access_active,
    notes: null,
  };

  const { error } = existing
    ? await supabase.from("team_member_access").update(payload).eq("id", existing.id)
    : await supabase.from("team_member_access").insert(payload);

  if (error) throw new Error(error.message);
}

function normalizeTeamTransfer(input: TeamTransferInput) {
  const month = input.month.trim();
  const teamMemberId = input.team_member_id.trim();
  const transferredAt = input.status === "transferred" ? input.transferred_at : null;

  if (!monthPattern.test(month)) throw new Error("Month must use YYYY-MM-01 format");
  if (!teamMemberId) throw new Error("Team member is required");
  if (!isTeamTransferStatus(input.status)) throw new Error("Choose a valid transfer status");
  if (input.status === "transferred" && !transferredAt) throw new Error("Transferred date is required");

  return {
    month,
    team_member_id: teamMemberId,
    status: input.status,
    transferred_at: transferredAt,
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };
}

async function assertFreelanceClientSource(
  supabase: Awaited<ReturnType<typeof createClient>>,
  incomeSourceId: string | null
) {
  if (incomeSourceId === null) return;

  const { data, error } = await supabase
    .from("income_sources")
    .select("type")
    .eq("id", incomeSourceId)
    .maybeSingle();

  if (error) throw new Error(`Failed to validate income source: ${error.message}`);
  if (!data || data.type !== "freelance_client") {
    throw new Error("Team work can only be assigned to freelance client income sources");
  }
}

async function getTeamMemberName(supabase: SupabaseServerClient, teamMemberId: string) {
  const { data, error } = await supabase
    .from("team_members")
    .select("name")
    .eq("id", teamMemberId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load team member: ${error.message}`);
  return data?.name ?? "Team member";
}

async function getTeamPayoutCategoryId(supabase: SupabaseServerClient) {
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name, source_key")
    .eq("tag", "spent")
    .eq("active", true)
    .order("sort_order");

  if (error) throw new Error(`Failed to load expense categories: ${error.message}`);

  const category =
    categories?.find((item) => item.source_key === "team_payout") ??
    categories?.find((item) => item.name.toLowerCase() === "team payout") ??
    categories?.[0];

  if (category) return category.id;

  const { data: created, error: createError } = await supabase
    .from("categories")
    .insert({
      name: "Team payout",
      tag: "spent",
      notes: "Team payments sent after client money is received.",
      sort_order: 960,
      source_key: "team_payout",
    })
    .select("id")
    .single();

  if (createError) throw new Error(`Failed to create Team payout category: ${createError.message}`);
  return created.id;
}

interface TeamRateLookupRow {
  id: string;
  team_member_id: string;
  income_source_id: string;
  month: string;
  hourly_rate: number;
  currency: string;
  fx_rate: number;
  active: boolean;
}

interface BulkApproveEntryRow {
  id: string;
  team_member_id: string;
  income_source_id: string | null;
  date: string;
  hours: number | null;
  amount: number;
  currency: string;
  fx_rate: number;
  amount_idr: number;
  team_member: { name: string } | { name: string }[] | null;
  income_source: { name: string } | { name: string }[] | null;
}

function bulkApproveRelatedName(value: { name: string } | { name: string }[] | null): string {
  if (Array.isArray(value)) return value[0]?.name ?? "-";
  return value?.name ?? "-";
}

function rateKey(teamMemberId: string, incomeSourceId: string, month: string) {
  return `${teamMemberId}:${incomeSourceId}:${month}`;
}

function normalizeTeamRateApply(input: TeamRateApplyInput) {
  const entryIds = Array.from(new Set(input.entry_ids.map((id) => id.trim()).filter(Boolean)));
  const hourlyRate = Number(input.hourly_rate);
  const currency = input.currency.trim() || "IDR";
  const fxRate = currency === "IDR" ? 1 : Number(input.fx_rate);

  if (entryIds.length === 0) throw new Error("Choose at least one Team entry to recalculate.");
  if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) throw new Error("Hourly rate must be greater than zero");
  if (!["IDR", "USD", "AUD"].includes(currency)) throw new Error("Choose a valid currency");
  if (!Number.isFinite(fxRate) || fxRate <= 0) throw new Error("FX rate must be greater than zero");

  return { entryIds, hourlyRate, currency, fxRate };
}

function normalizeTeamBulkStatus(input: TeamBulkStatusInput) {
  const entryIds = Array.from(new Set(input.entry_ids.map((id) => id.trim()).filter(Boolean)));
  const status = input.status;
  const paidAt = status === "paid" ? input.paid_at?.trim() : null;

  if (entryIds.length === 0) throw new Error("Choose at least one Team entry to update.");
  if (!isTeamWorkStatus(status)) throw new Error("Choose a valid Team entry status.");
  if (status === "paid" && !paidAt) throw new Error("Paid date is required.");

  return { entryIds, status, paidAt };
}

async function upsertTeamPayoutTransaction(
  supabase: SupabaseServerClient,
  transferGroupId: string,
  teamMemberName: string,
  transferredAt: string,
  amountIdr: number,
  notes: string | null
) {
  if (amountIdr <= 0) {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("source_team_transfer_group_id", transferGroupId);
    if (error) throw new Error(error.message);
    return;
  }

  const categoryId = await getTeamPayoutCategoryId(supabase);
  const { error } = await supabase.from("transactions").upsert(
    {
      date: transferredAt,
      category_id: categoryId,
      direction: "out",
      amount: amountIdr,
      currency: "IDR",
      fx_rate: 1,
      amount_idr: amountIdr,
      notes: notes || `Team payout - ${teamMemberName}`,
      save_to: null,
      source: "team_transfer",
      generated_from: "team_transfer",
      source_income_transaction_id: null,
      source_team_transfer_group_id: transferGroupId,
      recurring_type: null,
      recurring_template_id: null,
      generated_month: `${transferredAt.slice(0, 7)}-01`,
    },
    { onConflict: "source_team_transfer_group_id" }
  );

  if (error) throw new Error(error.message);
}

export async function addTeamWorkEntry(input: TeamWorkEntryInput) {
  const supabase = await createClient();
  const entry = normalizeTeamWorkEntry(input);
  await assertFreelanceClientSource(supabase, entry.income_source_id);
  const { error } = await supabase.from("team_work_entries").insert(entry);
  if (error) throw new Error(error.message);
  revalidateTeamPaths();
}

export async function updateTeamWorkEntry(id: string, input: TeamWorkEntryInput) {
  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("team_work_entries")
    .select("transfer_group_id")
    .eq("id", id)
    .maybeSingle();

  if (currentError) throw new Error(currentError.message);

  const entry = normalizeTeamWorkEntry(input);
  await assertFreelanceClientSource(supabase, entry.income_source_id);
  const updatePayload = entry.status === "owed" ? { ...entry, transfer_group_id: null } : entry;
  const { error } = await supabase.from("team_work_entries").update(updatePayload).eq("id", id);
  if (error) throw new Error(error.message);

  if (current?.transfer_group_id) {
    await refreshTeamTransferGroupAmount(supabase, current.transfer_group_id);
  }

  revalidateTeamPaths();
}

export async function bulkApproveTeamWorkEntries(ids: string[]) {
  const entryIds = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  if (entryIds.length === 0) {
    throw new Error("Choose at least one Team work entry to approve.");
  }

  const supabase = await createClient();
  const { data: entries, error: entriesError } = await supabase
    .from("team_work_entries")
    .select(
      "id, team_member_id, income_source_id, date, hours, amount, currency, fx_rate, amount_idr, team_member:team_members(name), income_source:income_sources(name)"
    )
    .in("id", entryIds)
    .eq("status", "need_approval");

  if (entriesError) throw new Error(entriesError.message);

  const pendingEntries = (entries ?? []) as BulkApproveEntryRow[];
  if (pendingEntries.length === 0) {
    throw new Error("No selected entries were waiting for approval.");
  }

  const entriesNeedingRates = pendingEntries.filter((entry) => Number(entry.amount_idr) === 0);
  const memberIds = Array.from(new Set(entriesNeedingRates.map((entry) => entry.team_member_id)));
  const sourceIds = Array.from(
    new Set(
      entriesNeedingRates
        .map((entry) => entry.income_source_id)
        .filter((value): value is string => Boolean(value))
    )
  );
  const months = Array.from(new Set(entriesNeedingRates.map((entry) => monthFromDate(entry.date))));
  const { data: rates, error: ratesError } =
    entriesNeedingRates.length > 0 && memberIds.length > 0 && sourceIds.length > 0 && months.length > 0
      ? await supabase
          .from("team_member_rates")
          .select("id, team_member_id, income_source_id, month, hourly_rate, currency, fx_rate, active")
          .in("team_member_id", memberIds)
          .in("income_source_id", sourceIds)
          .in("month", months)
          .eq("active", true)
      : { data: [], error: null };

  if (ratesError) throw new Error(ratesError.message);

  const rateByKey = new Map(
    ((rates ?? []) as TeamRateLookupRow[]).map((rate) => [
      rateKey(rate.team_member_id, rate.income_source_id, rate.month),
      rate,
    ])
  );

  const missingRateLabels: string[] = [];
  const updatePayloads = pendingEntries.map((entry) => {
    if (Number(entry.amount_idr) > 0) {
      return {
        id: entry.id,
        amount: entry.amount,
        currency: entry.currency,
        fx_rate: entry.fx_rate,
        amount_idr: entry.amount_idr,
      };
    }

    if (!entry.income_source_id) {
      missingRateLabels.push(`${bulkApproveRelatedName(entry.team_member)} - no client - ${monthFromDate(entry.date)}`);
      return null;
    }

    const rate = rateByKey.get(rateKey(entry.team_member_id, entry.income_source_id, monthFromDate(entry.date)));
    const calculated = rate ? calculateTeamAmount(entry.hours, rate) : null;

    if (!rate || !calculated) {
      missingRateLabels.push(
        `${bulkApproveRelatedName(entry.team_member)} - ${bulkApproveRelatedName(entry.income_source)} - ${monthFromDate(entry.date)}`
      );
      return null;
    }

    return {
      id: entry.id,
      amount: calculated.amount,
      currency: calculated.currency,
      fx_rate: calculated.fxRate,
      amount_idr: calculated.amountIdr,
    };
  });

  if (missingRateLabels.length > 0) {
    throw new Error(`Missing active Team rate or valid hours for: ${missingRateLabels.slice(0, 5).join(", ")}`);
  }

  let approvedCount = 0;
  for (const payload of updatePayloads) {
    if (!payload) continue;
    const { data, error } = await supabase
      .from("team_work_entries")
      .update({
        amount: payload.amount,
        currency: payload.currency,
        fx_rate: payload.fx_rate,
        amount_idr: payload.amount_idr,
        status: "owed",
        paid_at: null,
        transfer_group_id: null,
      })
      .eq("id", payload.id)
      .eq("status", "need_approval")
      .select("id");

    if (error) throw new Error(error.message);
    approvedCount += data?.length ?? 0;
  }

  revalidateTeamPaths();
  return { approvedCount };
}

export async function applyTeamRateToEntries(input: TeamRateApplyInput) {
  const { entryIds, hourlyRate, currency, fxRate } = normalizeTeamRateApply(input);
  const supabase = await createClient();
  const { data: entries, error: entriesError } = await supabase
    .from("team_work_entries")
    .select("id, team_member_id, income_source_id, date, hours, status")
    .in("id", entryIds)
    .in("status", ["need_approval", "owed"]);

  if (entriesError) throw new Error(entriesError.message);
  if (!entries || entries.length === 0) {
    throw new Error("No selected editable Team entries found.");
  }

  const invalidEntries = entries.filter((entry) => !entry.income_source_id || !entry.hours || entry.hours <= 0);
  if (invalidEntries.length > 0) {
    throw new Error("Every selected entry needs a client and valid hours before a subtotal rate can be applied.");
  }

  const rateRowsByKey = new Map<
    string,
    {
      team_member_id: string;
      income_source_id: string;
      month: string;
      hourly_rate: number;
      currency: string;
      fx_rate: number;
      active: boolean;
      updated_at: string;
    }
  >();

  const updatedAt = new Date().toISOString();
  for (const entry of entries) {
    const incomeSourceId = entry.income_source_id;
    if (!incomeSourceId) continue;
    const month = monthFromDate(entry.date);
    rateRowsByKey.set(rateKey(entry.team_member_id, incomeSourceId, month), {
      team_member_id: entry.team_member_id,
      income_source_id: incomeSourceId,
      month,
      hourly_rate: hourlyRate,
      currency,
      fx_rate: fxRate,
      active: true,
      updated_at: updatedAt,
    });
  }

  const rateRows = Array.from(rateRowsByKey.values());
  if (rateRows.length > 0) {
    const { error: rateError } = await supabase
      .from("team_member_rates")
      .upsert(rateRows, { onConflict: "team_member_id,income_source_id,month" });
    if (rateError) throw new Error(rateError.message);
  }

  let updatedCount = 0;
  for (const entry of entries) {
    const calculated = calculateTeamAmount(entry.hours, { hourly_rate: hourlyRate, currency, fx_rate: fxRate });
    if (!calculated) continue;

    const { data, error } = await supabase
      .from("team_work_entries")
      .update({
        amount: calculated.amount,
        currency: calculated.currency,
        fx_rate: calculated.fxRate,
        amount_idr: calculated.amountIdr,
      })
      .eq("id", entry.id)
      .in("status", ["need_approval", "owed"])
      .select("id");

    if (error) throw new Error(error.message);
    updatedCount += data?.length ?? 0;
  }

  revalidateTeamPaths();
  return { updatedCount };
}

export async function bulkUpdateTeamWorkStatus(input: TeamBulkStatusInput) {
  const { entryIds, status, paidAt } = normalizeTeamBulkStatus(input);
  const supabase = await createClient();
  const { data: entries, error: entriesError } = await supabase
    .from("team_work_entries")
    .select("id, team_member_id, date, amount_idr, status")
    .in("id", entryIds)
    .neq("status", "paid");

  if (entriesError) throw new Error(entriesError.message);
  if (!entries || entries.length === 0) {
    throw new Error("No selected editable Team entries found.");
  }

  if (status !== "need_approval") {
    const missingAmountCount = entries.filter((entry) => Number(entry.amount_idr) <= 0).length;
    if (missingAmountCount > 0) {
      throw new Error("Selected entries need a calculated amount before changing to Owed or Paid.");
    }
  }

  if (status !== "paid") {
    const { data, error } = await supabase
      .from("team_work_entries")
      .update({
        status,
        paid_at: null,
        transfer_group_id: null,
      })
      .in(
        "id",
        entries.map((entry) => entry.id)
      )
      .neq("status", "paid")
      .select("id");

    if (error) throw new Error(error.message);
    revalidateTeamPaths();
    return { updatedCount: data?.length ?? 0 };
  }

  if (!paidAt) throw new Error("Paid date is required.");

  const groups = new Map<string, { teamMemberId: string; month: string; ids: string[] }>();
  for (const entry of entries) {
    const month = monthFromDate(entry.date);
    const key = `${entry.team_member_id}:${month}`;
    const current = groups.get(key) ?? { teamMemberId: entry.team_member_id, month, ids: [] };
    current.ids.push(entry.id);
    groups.set(key, current);
  }

  let updatedCount = 0;
  for (const group of groups.values()) {
    const [start, end] = monthRange(group.month);
    const { data: existingTransferredEntries, error: existingError } = await supabase
      .from("team_work_entries")
      .select("transfer_group_id")
      .eq("team_member_id", group.teamMemberId)
      .not("transfer_group_id", "is", null)
      .gte("date", start)
      .lt("date", end);

    if (existingError) throw new Error(existingError.message);

    const transferGroupId =
      existingTransferredEntries
        ?.map((entry) => entry.transfer_group_id)
        .find((value): value is string => Boolean(value)) ?? randomUUID();

    const { data, error } = await supabase
      .from("team_work_entries")
      .update({
        status: "paid",
        paid_at: paidAt,
        transfer_group_id: transferGroupId,
      })
      .in("id", group.ids)
      .neq("status", "paid")
      .select("id");

    if (error) throw new Error(error.message);
    updatedCount += data?.length ?? 0;

    const { data: groupEntries, error: groupEntriesError } = await supabase
      .from("team_work_entries")
      .select("amount_idr")
      .eq("transfer_group_id", transferGroupId);

    if (groupEntriesError) throw new Error(groupEntriesError.message);

    const amountIdr = (groupEntries ?? []).reduce((sum, entry) => sum + Number(entry.amount_idr), 0);
    const teamMemberName = await getTeamMemberName(supabase, group.teamMemberId);
    await upsertTeamPayoutTransaction(supabase, transferGroupId, teamMemberName, paidAt, amountIdr, null);
  }

  revalidateTeamPaths();
  return { updatedCount };
}

export async function deleteTeamWorkEntry(id: string) {
  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("team_work_entries")
    .select("transfer_group_id")
    .eq("id", id)
    .maybeSingle();

  if (currentError) throw new Error(currentError.message);

  const { error } = await supabase.from("team_work_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (current?.transfer_group_id) {
    await refreshTeamTransferGroupAmount(supabase, current.transfer_group_id);
  }

  revalidateTeamPaths();
}

async function refreshTeamTransferGroupAmount(supabase: SupabaseServerClient, transferGroupId: string) {
  const { data: entries, error: entriesError } = await supabase
    .from("team_work_entries")
    .select("team_member_id, amount_idr, paid_at")
    .eq("transfer_group_id", transferGroupId);

  if (entriesError) throw new Error(entriesError.message);

  if (!entries || entries.length === 0) {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("source_team_transfer_group_id", transferGroupId);

    if (error) throw new Error(error.message);
    return;
  }

  const { data: currentTransaction, error: transactionError } = await supabase
    .from("transactions")
    .select("date, notes")
    .eq("source_team_transfer_group_id", transferGroupId)
    .maybeSingle();

  if (transactionError) throw new Error(transactionError.message);

  const amountIdr = entries.reduce((sum, entry) => sum + Number(entry.amount_idr), 0);
  const transferredAt =
    currentTransaction?.date ??
    entries.find((entry) => entry.paid_at)?.paid_at ??
    new Date().toISOString().slice(0, 10);
  const teamMemberName = await getTeamMemberName(supabase, entries[0].team_member_id);
  await upsertTeamPayoutTransaction(
    supabase,
    transferGroupId,
    teamMemberName,
    transferredAt,
    amountIdr,
    currentTransaction?.notes ?? null
  );
}

export async function saveTeamTransferStatus(input: TeamTransferInput) {
  const supabase = await createClient();
  const transfer = normalizeTeamTransfer(input);
  const [start, end] = monthRange(transfer.month);
  const { data: existingTransferredEntries, error: existingError } = await supabase
    .from("team_work_entries")
    .select("transfer_group_id, amount_idr")
    .eq("team_member_id", transfer.team_member_id)
    .not("transfer_group_id", "is", null)
    .gte("date", start)
    .lt("date", end);

  if (existingError) throw new Error(existingError.message);

  const existingTransferGroupIds = Array.from(
    new Set(
      (existingTransferredEntries ?? [])
        .map((entry) => entry.transfer_group_id)
        .filter((value): value is string => Boolean(value))
    )
  );

  if (transfer.status === "not_transferred") {
    if (existingTransferGroupIds.length > 0) {
      const { error: entriesError } = await supabase
        .from("team_work_entries")
        .update({ status: "owed", paid_at: null, transfer_group_id: null })
        .in("transfer_group_id", existingTransferGroupIds);

      if (entriesError) throw new Error(entriesError.message);

      const { error: transactionError } = await supabase
        .from("transactions")
        .delete()
        .in("source_team_transfer_group_id", existingTransferGroupIds);

      if (transactionError) throw new Error(transactionError.message);
    }

    revalidateTeamPaths();
    return;
  }

  const transferredAt = transfer.transferred_at;
  if (!transferredAt) throw new Error("Transferred date is required");

  const { data: owedEntries, error: owedError } = await supabase
    .from("team_work_entries")
    .select("id, amount_idr")
    .eq("team_member_id", transfer.team_member_id)
    .eq("status", "owed")
    .gte("date", start)
    .lt("date", end);

  if (owedError) throw new Error(owedError.message);

  const newOwedAmountIdr = (owedEntries ?? []).reduce((sum, entry) => sum + Number(entry.amount_idr), 0);
  const existingAmountIdr = (existingTransferredEntries ?? []).reduce(
    (sum, entry) => sum + Number(entry.amount_idr),
    0
  );
  const amountIdr = existingAmountIdr + newOwedAmountIdr;

  if (amountIdr <= 0) {
    throw new Error("No owed Team entries found for this person and month.");
  }

  const transferGroupId = existingTransferGroupIds[0] ?? randomUUID();
  const owedEntryIds = (owedEntries ?? []).map((entry) => entry.id);
  if (owedEntryIds.length > 0) {
    const { error: entriesError } = await supabase
      .from("team_work_entries")
      .update({
        status: "paid",
        paid_at: transferredAt,
        transfer_group_id: transferGroupId,
      })
      .in("id", owedEntryIds);

    if (entriesError) throw new Error(entriesError.message);
  }

  const teamMemberName = await getTeamMemberName(supabase, transfer.team_member_id);
  await upsertTeamPayoutTransaction(
    supabase,
    transferGroupId,
    teamMemberName,
    transferredAt,
    amountIdr,
    transfer.notes
  );

  revalidateTeamPaths();
}

export async function addTeamMember(input: TeamMemberInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("team_members").insert(normalizeTeamMember(input)).select("id").single();
  if (error) throw new Error(error.message);
  await upsertTeamMemberAccess(supabase, data.id, input);
  revalidateTeamPaths();
}

export async function updateTeamMember(id: string, input: TeamMemberInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("team_members").update(normalizeTeamMember(input)).eq("id", id);
  if (error) throw new Error(error.message);
  await upsertTeamMemberAccess(supabase, id, input);
  revalidateTeamPaths();
}

export async function setTeamMemberActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("team_members").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateTeamPaths();
}

export async function deleteTeamMember(id: string) {
  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("team_work_entries")
    .select("id", { count: "exact", head: true })
    .eq("team_member_id", id);

  if (countError) throw new Error(countError.message);
  if ((count ?? 0) > 0) {
    throw new Error("This team member has work entries. Deactivate them instead.");
  }

  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateTeamPaths();
}
