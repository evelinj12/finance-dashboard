import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/money";
import { MonthPicker } from "@/components/month-picker";
import { createClient } from "@/lib/supabase/server";
import { monthRange, monthStart } from "@/lib/dates";
import { calculateClientNet } from "@/lib/finance/team-net";
import { DeleteTeamMemberButton } from "./delete-team-member-button";
import { DeleteTeamWorkButton } from "./delete-team-work-button";
import { TeamMemberDialog } from "./team-member-dialog";
import { TeamWorkDialog } from "./team-work-dialog";
import { TeamWorkQuickForm } from "./team-work-quick-form";

const statusLabels = {
  owed: "Owed",
  paid: "Paid",
};

interface RelatedName {
  name: string;
  type?: string;
}

function relatedName(value: RelatedName | RelatedName[] | null): string {
  if (Array.isArray(value)) return value[0]?.name ?? "-";
  return value?.name ?? "-";
}

function relatedType(value: RelatedName | RelatedName[] | null): string | undefined {
  if (Array.isArray(value)) return value[0]?.type;
  return value?.type;
}

function entrySourceOption(
  entry: {
    income_source_id: string | null;
    income_source: RelatedName | RelatedName[] | null;
  },
  sources: { id: string; name: string; type: string }[]
) {
  if (!entry.income_source_id || sources.some((source) => source.id === entry.income_source_id)) {
    return sources;
  }

  const source = entry.income_source as RelatedName | RelatedName[] | null;
  if (relatedType(source) !== "freelance_client") return sources;

  return [
    ...sources,
    {
      id: entry.income_source_id,
      name: relatedName(source),
      type: "freelance_client",
    },
  ];
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? monthStart();
  const [start, end] = monthRange(month);
  const supabase = await createClient();

  const [
    { data: members, error: membersError },
    { data: sources, error: sourcesError },
    { data: entries, error: entriesError },
    { data: incomeTx, error: incomeTxError },
  ] = await Promise.all([
    supabase.from("team_members").select("id, name, active, default_currency, notes").order("name"),
    supabase
      .from("income_sources")
      .select("id, name, type")
      .eq("active", true)
      .eq("type", "freelance_client")
      .order("name"),
    supabase
      .from("team_work_entries")
      .select(
        "id, team_member_id, income_source_id, date, description, work_period, hours, amount, currency, fx_rate, amount_idr, status, paid_at, notes, team_member:team_members(name), income_source:income_sources(name, type)"
      )
      .gte("date", start)
      .lt("date", end)
      .order("date", { ascending: false }),
    supabase
      .from("income_transactions")
      .select("id, income_source_id, amount_idr, total_hours, income_source:income_sources(name, type)")
      .gte("date", start)
      .lt("date", end),
  ]);

  if (membersError) throw new Error(`Failed to load team members: ${membersError.message}`);
  if (sourcesError) throw new Error(`Failed to load freelance client sources: ${sourcesError.message}`);
  if (entriesError) throw new Error(`Failed to load team work entries: ${entriesError.message}`);
  if (incomeTxError) throw new Error(`Failed to load client income transactions: ${incomeTxError.message}`);

  const memberList = members ?? [];
  const sourceList = sources ?? [];
  const teamEntries = entries ?? [];

  const owedTotal = teamEntries
    .filter((entry) => entry.status === "owed")
    .reduce((sum, entry) => sum + entry.amount_idr, 0);
  const paidTotal = teamEntries
    .filter((entry) => entry.status === "paid")
    .reduce((sum, entry) => sum + entry.amount_idr, 0);
  const teamTotal = owedTotal + paidTotal;
  const teamHours = teamEntries.reduce((sum, entry) => sum + (entry.hours ?? 0), 0);

  const clientSummary = new Map<
    string,
    {
      id: string;
      name: string;
      grossAmountIdr: number;
      grossHours: number;
      teamAmountIdr: number;
      teamHours: number;
    }
  >();

  for (const tx of incomeTx ?? []) {
    const source = tx.income_source as RelatedName | RelatedName[] | null;
    if (relatedType(source) !== "freelance_client") continue;
    const sourceId = tx.income_source_id;
    const current =
      clientSummary.get(sourceId) ??
      {
        id: sourceId,
        name: relatedName(source),
        grossAmountIdr: 0,
        grossHours: 0,
        teamAmountIdr: 0,
        teamHours: 0,
      };
    current.grossAmountIdr += tx.amount_idr;
    current.grossHours += tx.total_hours ?? 0;
    clientSummary.set(sourceId, current);
  }

  for (const entry of teamEntries) {
    const sourceId = entry.income_source_id ?? "unassigned";
    const source = entry.income_source as RelatedName | RelatedName[] | null;
    if (sourceId !== "unassigned" && relatedType(source) !== "freelance_client") continue;
    const current =
      clientSummary.get(sourceId) ??
      {
        id: sourceId,
        name: sourceId === "unassigned" ? "Unassigned" : relatedName(source),
        grossAmountIdr: 0,
        grossHours: 0,
        teamAmountIdr: 0,
        teamHours: 0,
      };
    current.teamAmountIdr += entry.amount_idr;
    current.teamHours += entry.hours ?? 0;
    clientSummary.set(sourceId, current);
  }

  const clientRows = Array.from(clientSummary.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">Team</h2>
        <div className="flex items-center gap-2">
          <MonthPicker month={month} />
          <TeamMemberDialog
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Member
              </Button>
            }
          />
        </div>
      </div>

      <TeamWorkQuickForm key={month} members={memberList} sources={sourceList} selectedMonth={month} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Owed</CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={owedTotal} className="text-xl font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={paidTotal} className="text-xl font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team total</CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={teamTotal} className="text-xl font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold tabular-nums">{teamHours.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Gross money</TableHead>
                <TableHead className="text-right">Gross time</TableHead>
                <TableHead className="text-right">Team money</TableHead>
                <TableHead className="text-right">Team time</TableHead>
                <TableHead className="text-right">User net money</TableHead>
                <TableHead className="text-right">User net time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientRows.map((row) => {
                const net = calculateClientNet(row);
                return (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-right">
                      <Money amountIdr={row.grossAmountIdr} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.grossHours.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Money amountIdr={row.teamAmountIdr} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.teamHours.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Money amountIdr={net.netAmountIdr} signed />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{net.netHours.toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
              {clientRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No client or team data for this month yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Default currency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-44" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberList.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.name}</TableCell>
                  <TableCell>{member.default_currency}</TableCell>
                  <TableCell>
                    <Badge variant={member.active ? "secondary" : "outline"}>
                      {member.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{member.notes ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <TeamMemberDialog
                        member={member}
                        trigger={
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        }
                      />
                      <DeleteTeamMemberButton id={member.id} active={member.active} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {memberList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No team members yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Team work entries</CardTitle>
          <TeamWorkDialog
            members={memberList}
            sources={sourceList}
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Entry
              </Button>
            }
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
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
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap">{entry.date}</TableCell>
                  <TableCell>{relatedName(entry.team_member as RelatedName | RelatedName[] | null)}</TableCell>
                  <TableCell>{relatedName(entry.income_source as RelatedName | RelatedName[] | null)}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.description ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.work_period ?? "-"}</TableCell>
                  <TableCell className="text-right tabular-nums">{entry.hours ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={entry.status === "owed" ? "destructive" : "secondary"}>
                      {statusLabels[entry.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Money amountIdr={entry.amount_idr} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{entry.paid_at ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.notes ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <TeamWorkDialog
                        members={memberList}
                        sources={entrySourceOption(
                          entry as {
                            income_source_id: string | null;
                            income_source: RelatedName | RelatedName[] | null;
                          },
                          sourceList
                        )}
                        entry={entry}
                        trigger={
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        }
                      />
                      <DeleteTeamWorkButton id={entry.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {teamEntries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                    No team work logged this month yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
