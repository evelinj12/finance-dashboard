import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/money";
import { MonthPicker } from "@/components/month-picker";
import { createClient } from "@/lib/supabase/server";
import { formatMonthLabel, monthStart } from "@/lib/dates";
import type { FamilySupportDirection, FamilyTransferStatus } from "@/lib/supabase/types";
import { DeleteFamilyEntryButton } from "./delete-family-entry-button";
import { FamilyEntryDialog } from "./family-entry-dialog";
import { FamilyEntryForm } from "./family-entry-form";
import { FamilyTransferForm } from "./family-transfer-form";

interface FamilyEntry {
  id: string;
  month: string;
  entry_date: string | null;
  person: string;
  direction: FamilySupportDirection;
  description: string;
  amount: number;
  currency: string;
  fx_rate: number;
  amount_idr: number;
  notes: string | null;
  source_sheet: string | null;
  source_row: string | null;
  created_at: string;
}

interface FamilyTransfer {
  id: string;
  month: string;
  person: string;
  status: FamilyTransferStatus;
  transferred_at: string | null;
  notes: string | null;
}

function directionLabel(direction: FamilySupportDirection) {
  return direction === "add" ? "Tambah" : "Potong";
}

function statusLabel(status: FamilyTransferStatus | undefined) {
  return status === "transferred" ? "Transferred" : "Not transferred";
}

export default async function FamilyPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? monthStart();
  const supabase = await createClient();

  const [{ data: entries, error: entriesError }, { data: transfers, error: transfersError }] = await Promise.all([
    supabase
      .from("family_support_entries")
      .select(
        "id, month, entry_date, person, direction, description, amount, currency, fx_rate, amount_idr, notes, source_sheet, source_row, created_at"
      )
      .eq("month", month)
      .order("direction", { ascending: true })
      .order("entry_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("family_support_transfers")
      .select("id, month, person, status, transferred_at, notes")
      .eq("month", month)
      .order("person"),
  ]);

  if (entriesError) throw new Error(`Failed to load family records: ${entriesError.message}`);
  if (transfersError) throw new Error(`Failed to load family transfer status: ${transfersError.message}`);

  const entryRows = (entries ?? []) as FamilyEntry[];
  const transferRows = (transfers ?? []) as FamilyTransfer[];
  const discoveredPeople = Array.from(
    new Set([...entryRows.map((entry) => entry.person), ...transferRows.map((transfer) => transfer.person)])
  ).sort((a, b) => a.localeCompare(b));
  const people = discoveredPeople.length > 0 ? discoveredPeople : ["Sister"];
  const transferByPerson = new Map(transferRows.map((transfer) => [transfer.person, transfer]));
  const additions = entryRows
    .filter((entry) => entry.direction === "add")
    .reduce((sum, entry) => sum + entry.amount_idr, 0);
  const deductions = entryRows
    .filter((entry) => entry.direction === "deduct")
    .reduce((sum, entry) => sum + entry.amount_idr, 0);
  const amountToSend = additions - deductions;

  const personSummaries = people.map((person) => {
    const personEntries = entryRows.filter((entry) => entry.person === person);
    const personAdditions = personEntries
      .filter((entry) => entry.direction === "add")
      .reduce((sum, entry) => sum + entry.amount_idr, 0);
    const personDeductions = personEntries
      .filter((entry) => entry.direction === "deduct")
      .reduce((sum, entry) => sum + entry.amount_idr, 0);
    const transfer = transferByPerson.get(person);

    return {
      person,
      additions: personAdditions,
      deductions: personDeductions,
      amountToSend: personAdditions - personDeductions,
      status: transfer?.status,
      transferredAt: transfer?.transferred_at,
      notes: transfer?.notes,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold">Family</h2>
          <p className="text-sm text-muted-foreground">
            Record only. Any amount given to family should still be recorded in Transactions as an expense.
          </p>
        </div>
        <MonthPicker month={month} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick family record</CardTitle>
        </CardHeader>
        <CardContent>
          <FamilyEntryForm key={month} selectedMonth={month} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tambah</CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={additions} className="text-xl font-semibold text-emerald-700" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Potong</CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={deductions} className="text-xl font-semibold text-rose-600" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Amount to send for {formatMonthLabel(month)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={amountToSend} signed className="text-xl font-semibold" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transfer status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FamilyTransferForm selectedMonth={month} people={people} transfers={transferRows} />
          <div className="grid gap-2 md:grid-cols-2">
            {personSummaries.map((summary) => (
              <div key={summary.person} className="rounded-md border bg-white/55 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{summary.person}</p>
                  <Badge variant={summary.status === "transferred" ? "secondary" : "outline"}>
                    {statusLabel(summary.status)}
                  </Badge>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Amount to send</p>
                    <Money amountIdr={summary.amountToSend} signed className="font-medium" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Transferred at</p>
                    <p className="font-medium">{summary.transferredAt ?? "-"}</p>
                  </div>
                </div>
                {summary.notes ? <p className="mt-2 text-sm text-muted-foreground">{summary.notes}</p> : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Family records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Person</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entryRows.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap">{entry.entry_date ?? "-"}</TableCell>
                  <TableCell>{entry.person}</TableCell>
                  <TableCell>
                    <Badge variant={entry.direction === "add" ? "secondary" : "outline"}>
                      {directionLabel(entry.direction)}
                    </Badge>
                  </TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell className="text-right">
                    <Money amountIdr={entry.direction === "deduct" ? -entry.amount_idr : entry.amount_idr} signed />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{entry.notes ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.source_sheet ?? "Manual"}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <FamilyEntryDialog
                        entry={entry}
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${entry.description}`}>
                            <Pencil className="size-4" />
                          </Button>
                        }
                      />
                      <DeleteFamilyEntryButton id={entry.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {entryRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No family records for this month yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
