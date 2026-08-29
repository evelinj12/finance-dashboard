"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { monthRange } from "@/lib/dates";
import type { TeamTransferStatus, TeamWorkStatus } from "@/lib/supabase/types";

const teamWorkStatuses = ["owed", "paid"] as const;
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
}

export interface TeamTransferInput {
  month: string;
  team_member_id: string;
  status: TeamTransferStatus;
  transferred_at: string | null;
  notes: string | null;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function validateTeamWorkEntry(input: TeamWorkEntryInput) {
  if (!input.team_member_id) {
    throw new Error("Team member is required");
  }
  if (!input.date) {
    throw new Error("Date is required");
  }
  if (!Number.isFinite(input.amount) || input.amount === 0) {
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
  if (!Number.isFinite(amountIdr) || amountIdr === 0) {
    throw new Error("Amount in IDR cannot be zero");
  }

  return {
    ...input,
    description: input.description?.trim() || null,
    work_period: input.work_period?.trim() || null,
    currency: input.currency.trim() || "IDR",
    amount_idr: amountIdr,
    paid_at: input.status === "paid" ? input.paid_at : null,
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
  const { error } = await supabase.from("team_members").insert(normalizeTeamMember(input));
  if (error) throw new Error(error.message);
  revalidateTeamPaths();
}

export async function updateTeamMember(id: string, input: TeamMemberInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("team_members").update(normalizeTeamMember(input)).eq("id", id);
  if (error) throw new Error(error.message);
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
