import { unstable_noStore as noStore } from "next/cache";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface TeamAccessProfile {
  id: string;
  team_member_id: string;
  email: string | null;
  active: boolean;
  team_member: {
    name: string;
    active: boolean;
  } | null;
}

type TeamAccessRow = {
  id: string;
  team_member_id: string;
  email: string | null;
  active: boolean;
  team_member: { name: string; active: boolean } | { name: string; active: boolean }[] | null;
};

function normalizeProfile(row: TeamAccessRow): TeamAccessProfile {
  const teamMember = Array.isArray(row.team_member) ? row.team_member[0] : row.team_member;
  return {
    id: row.id,
    team_member_id: row.team_member_id,
    email: row.email,
    active: row.active,
    team_member: teamMember ?? null,
  };
}

export async function getTeamAccessProfile(supabase: SupabaseServerClient): Promise<TeamAccessProfile | null> {
  noStore();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw new Error(userError.message);
  if (!user) return null;

  const select = "id, team_member_id, email, active, team_member:team_members(name, active)";
  const { data: linkedProfile, error: linkedError } = await supabase
    .from("team_member_access")
    .select(select)
    .eq("user_id", user.id)
    .maybeSingle();

  if (linkedError) throw new Error(linkedError.message);
  if (linkedProfile) return normalizeProfile(linkedProfile as TeamAccessRow);

  const email = user.email?.trim().toLowerCase();
  if (!email) return null;

  const { data: claimedProfile, error: claimError } = await supabase
    .from("team_member_access")
    .update({ user_id: user.id, last_seen_at: new Date().toISOString() })
    .eq("email", email)
    .is("user_id", null)
    .eq("active", true)
    .select(select)
    .maybeSingle();

  if (claimError) throw new Error(claimError.message);
  if (claimedProfile) return normalizeProfile(claimedProfile as TeamAccessRow);

  const { data: emailProfile, error: emailError } = await supabase
    .from("team_member_access")
    .select(select)
    .eq("email", email)
    .maybeSingle();

  if (emailError) throw new Error(emailError.message);
  return emailProfile ? normalizeProfile(emailProfile as TeamAccessRow) : null;
}

export async function isTeamAccessUser(supabase: SupabaseServerClient) {
  const profile = await getTeamAccessProfile(supabase);
  return Boolean(profile);
}

export async function getCurrentUser(supabase: SupabaseServerClient) {
  noStore();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw new Error(error.message);
  return user;
}
