import { createClient } from "@/lib/supabase/server";
import { Nav, type NavLink } from "@/components/nav";
import type { Json } from "@/lib/supabase/types";

export const DEFAULT_NAV_LINKS: NavLink[] = [
  { id: "overview", href: "/", label: "Overview" },
  { id: "budget", href: "/budget", label: "Budget" },
  { id: "saving-health", href: "/saving-health", label: "Saving Health" },
  { id: "transactions", href: "/transactions", label: "Transactions" },
  { id: "income", href: "/income", label: "Income" },
  { id: "team", href: "/team", label: "Team" },
  { id: "networth", href: "/networth", label: "Net Worth" },
  { id: "exports", href: "/exports", label: "Exports" },
  { id: "settings", href: "/settings", label: "Settings" },
];

export interface NavPreferences {
  order: string[];
  hidden: string[];
}

const nonHideableNavIds = new Set(["settings"]);

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function parseNavPreferences(value: Json | null | undefined): NavPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      order: DEFAULT_NAV_LINKS.map((link) => link.id),
      hidden: [],
    };
  }

  const maybePrefs = value as { order?: unknown; hidden?: unknown };
  return {
    order: isStringArray(maybePrefs.order) ? maybePrefs.order : DEFAULT_NAV_LINKS.map((link) => link.id),
    hidden: isStringArray(maybePrefs.hidden) ? maybePrefs.hidden.filter((id) => !nonHideableNavIds.has(id)) : [],
  };
}

export function orderedNavLinks(preferences: NavPreferences): NavLink[] {
  const linkMap = new Map(DEFAULT_NAV_LINKS.map((link) => [link.id, link]));
  const hidden = new Set(preferences.hidden.filter((id) => !nonHideableNavIds.has(id)));
  const orderedIds = [...preferences.order, ...DEFAULT_NAV_LINKS.map((link) => link.id)];
  const seen = new Set<string>();

  return orderedIds.flatMap((id) => {
    if (seen.has(id) || hidden.has(id)) return [];
    seen.add(id);
    const link = linkMap.get(id);
    return link ? [link] : [];
  });
}

export async function getNavPreferences(): Promise<NavPreferences> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dashboard_preferences")
    .select("value")
    .eq("key", "nav")
    .maybeSingle();

  if (error) throw new Error(`Failed to load navigation preferences: ${error.message}`);
  return parseNavPreferences(data?.value);
}

export async function NavShell() {
  const preferences = await getNavPreferences();
  return <Nav links={orderedNavLinks(preferences)} />;
}
