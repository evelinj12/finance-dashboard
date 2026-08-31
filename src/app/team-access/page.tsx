import { Clock, LogOut, Send, Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DurationDisplay } from "@/components/duration-display";
import { Money } from "@/components/money";
import { todayStr } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getTeamAccessProfile } from "@/lib/team-access";
import { signOutTeamAccess, submitTeamAccessWork } from "./actions";

const statusLabels = {
  need_approval: "Need approval",
  owed: "Approved - owed",
  paid: "Transferred",
};

const statusBadgeClasses = {
  need_approval: "border-amber-200 bg-amber-50 text-amber-700",
  owed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  paid: "border-sky-200 bg-sky-50 text-sky-700",
};

type RelatedName = { name: string } | { name: string }[] | null;

function relatedName(value: RelatedName) {
  if (Array.isArray(value)) return value[0]?.name ?? "-";
  return value?.name ?? "-";
}

export default async function TeamAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const supabase = await createClient();
  const profile = await getTeamAccessProfile(supabase);

  if (!profile) redirect("/team-access/login");
  if (!profile.active || !profile.team_member?.active) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-sky-50 p-4">
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Team access inactive</CardTitle>
            <CardDescription>Ask Evelin to activate your team access before submitting work.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signOutTeamAccess}>
              <Button type="submit" variant="outline">
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  const [{ data: sources, error: sourcesError }, { data: entries, error: entriesError }] = await Promise.all([
    supabase
      .from("income_sources")
      .select("id, name")
      .eq("active", true)
      .eq("type", "freelance_client")
      .order("name"),
    supabase
      .from("team_work_entries")
      .select("id, date, hours, amount_idr, status, description, created_at, income_source:income_sources(name)")
      .eq("team_member_id", profile.team_member_id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (sourcesError) throw new Error(sourcesError.message);
  if (entriesError) throw new Error(entriesError.message);

  const clientOptions = sources ?? [];
  const history = entries ?? [];
  const sections = [
    { title: "Need approval", statuses: ["need_approval"] },
    { title: "Approved - owed", statuses: ["owed"] },
    { title: "Transferred", statuses: ["paid"] },
  ];

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,#dff7ff,transparent_42%),linear-gradient(180deg,#f7fcff,#e8f8ff)] px-4 py-5">
      <div className="mx-auto flex min-h-[calc(100svh-2.5rem)] w-full max-w-md flex-col gap-4">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Duiteve</p>
            <h1 className="text-xl font-bold">Team access</h1>
          </div>
          <form action={signOutTeamAccess}>
            <Button type="submit" variant="ghost" size="icon-sm" aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </form>
        </header>

        <Card className="border-sky-100 bg-white/90 shadow-xl shadow-sky-950/10">
          <CardHeader>
            <CardTitle>Submit work</CardTitle>
            <CardDescription>{profile.team_member.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={submitTeamAccessWork} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">Submission date</Label>
                <Input id="date" name="date" type="date" defaultValue={todayStr()} required />
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Select name="income_source_id">
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientOptions.map((source) => (
                      <SelectItem key={source.id} value={source.id}>
                        {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hours">Time worked</Label>
                <Input id="hours" name="hours" placeholder="110m, 1:50, 1h 50m, or 1.83" required />
                <p className="text-xs text-muted-foreground">Minutes, decimal hours, or hh:mm:ss.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" placeholder="Optional note" />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
              <Button type="submit" className="h-12 w-full">
                <Send className="size-4" />
                Submit for approval
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-sky-100 bg-white/90">
          <CardHeader>
            <CardTitle>Submission history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {sections.map((section) => {
              const rows = history.filter((entry) => section.statuses.includes(entry.status));
              return (
                <section key={section.title} className="space-y-2">
                  <h2 className="font-semibold">{section.title}</h2>
                  {rows.length > 0 ? (
                    <div className="space-y-2">
                      {rows.map((entry) => (
                        <div key={entry.id} className="rounded-lg border border-sky-100 bg-white px-3 py-3 shadow-sm shadow-sky-950/5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{relatedName(entry.income_source as RelatedName)}</p>
                              <p className="text-sm text-muted-foreground">{entry.date}</p>
                            </div>
                            <Badge className={statusBadgeClasses[entry.status]}>
                              {statusLabels[entry.status]}
                            </Badge>
                          </div>
                          <div className="mt-3 flex items-end justify-between gap-3">
                            <DurationDisplay hours={entry.hours} align="left" />
                            {entry.status === "need_approval" ? (
                              <span className="text-sm text-muted-foreground">Amount pending</span>
                            ) : (
                              <Money amountIdr={entry.amount_idr} className="font-semibold" />
                            )}
                          </div>
                          {entry.description ? <p className="mt-2 text-sm text-muted-foreground">{entry.description}</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-sky-100 bg-sky-50/50 p-3 text-sm text-muted-foreground">
                      Nothing here yet.
                    </p>
                  )}
                </section>
              );
            })}
          </CardContent>
        </Card>

        <nav className="sticky bottom-3 mt-auto grid grid-cols-3 rounded-xl border border-sky-100 bg-white/90 p-1 shadow-xl shadow-sky-950/10 backdrop-blur">
          <a href="#date" className="flex flex-col items-center gap-1 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
            <Send className="size-4" />
            Submit
          </a>
          <a href="#" className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground">
            <Clock className="size-4" />
            History
          </a>
          <a href="#" className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground">
            <Settings className="size-4" />
            Settings
          </a>
        </nav>
      </div>
    </main>
  );
}
