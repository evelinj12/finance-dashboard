"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseDurationInput } from "@/lib/duration";
import { getTeamAccessProfile } from "@/lib/team-access";

const teamAccessLoginPaths = new Set(["/team-login", "/team-access/login"]);

function teamAccessLoginPath(formData?: FormData) {
  const path = String(formData?.get("login_path") ?? "");
  return teamAccessLoginPaths.has(path) ? path : "/team-login";
}

function teamAccessLoginUrl(message: string, type: "error" | "message" = "error", path = "/team-login") {
  const loginPath = teamAccessLoginPaths.has(path) ? path : "/team-login";
  return `${loginPath}?${type}=${encodeURIComponent(message)}`;
}

async function origin() {
  return (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function signInTeamAccess(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const loginPath = teamAccessLoginPath(formData);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect(teamAccessLoginUrl(error.message, "error", loginPath));
  redirect("/team-access");
}

export async function signUpTeamAccess(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const loginPath = teamAccessLoginPath(formData);
  const redirectTo = `${await origin()}/auth/callback?next=/team-access`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) redirect(teamAccessLoginUrl(error.message, "error", loginPath));
  if (data.session) redirect("/team-access");

  redirect(teamAccessLoginUrl("Check your email to confirm your account, then sign in here.", "message", loginPath));
}

export async function signInTeamAccessWithGoogle(formData?: FormData) {
  const loginPath = teamAccessLoginPath(formData);

  if (process.env.NEXT_PUBLIC_TEAM_ACCESS_GOOGLE_ENABLED !== "true") {
    redirect(teamAccessLoginUrl("Google sign-in is not enabled yet. Use email sign-in for now.", "error", loginPath));
  }

  const supabase = await createClient();
  const redirectTo = `${await origin()}/auth/callback?next=/team-access`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error) redirect(teamAccessLoginUrl(error.message, "error", loginPath));
  if (data.url) redirect(data.url);
  redirect(teamAccessLoginUrl("Could not start Google sign-in.", "error", loginPath));
}

export async function signOutTeamAccess() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/team-login");
}

export async function submitTeamAccessWork(formData: FormData) {
  const supabase = await createClient();
  const profile = await getTeamAccessProfile(supabase);

  if (!profile?.active || !profile.team_member?.active) {
    redirect(teamAccessLoginUrl("Your team access is not active yet."));
  }

  const date = String(formData.get("date") ?? "").trim();
  const incomeSourceId = String(formData.get("income_source_id") ?? "").trim();
  const hoursInput = String(formData.get("hours") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const hours = parseDurationInput(hoursInput);

  if (!date || !incomeSourceId || hours === null) {
    redirect("/team-access?error=Please%20add%20a%20date%2C%20client%2C%20and%20valid%20time.");
  }

  const { data: source, error: sourceError } = await supabase
    .from("income_sources")
    .select("id")
    .eq("id", incomeSourceId)
    .eq("type", "freelance_client")
    .eq("active", true)
    .maybeSingle();

  if (sourceError) throw new Error(sourceError.message);
  if (!source) redirect("/team-access?error=Choose%20a%20valid%20active%20client.");

  const { error } = await supabase.from("team_work_entries").insert({
    team_member_id: profile.team_member_id,
    income_source_id: incomeSourceId,
    date,
    description: description || null,
    work_period: null,
    hours,
    amount: 0,
    currency: "IDR",
    fx_rate: 1,
    amount_idr: 0,
    status: "need_approval",
    paid_at: null,
    notes: null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/team-access");
  revalidatePath("/team");
  redirect("/team-access?message=Submitted%20for%20approval.");
}
