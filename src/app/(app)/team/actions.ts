"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TeamWorkStatus } from "@/lib/supabase/types";

const teamWorkStatuses = ["owed", "paid"] as const;
const teamRevalidatePaths = ["/team", "/income", "/budget", "/saving-health", "/"];

function isTeamWorkStatus(value: string): value is TeamWorkStatus {
  return teamWorkStatuses.includes(value as TeamWorkStatus);
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

function validateTeamWorkEntry(input: TeamWorkEntryInput) {
  if (!input.team_member_id) {
    throw new Error("Team member is required");
  }
  if (!input.date) {
    throw new Error("Date is required");
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Amount must be greater than zero");
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
  if (!Number.isFinite(amountIdr) || amountIdr <= 0) {
    throw new Error("Amount in IDR must be greater than zero");
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
  const entry = normalizeTeamWorkEntry(input);
  await assertFreelanceClientSource(supabase, entry.income_source_id);
  const { error } = await supabase.from("team_work_entries").update(entry).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateTeamPaths();
}

export async function deleteTeamWorkEntry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("team_work_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
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
