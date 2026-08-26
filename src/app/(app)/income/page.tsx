import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/money";
import { MonthPicker } from "@/components/month-picker";
import { createClient } from "@/lib/supabase/server";
import { monthRange, monthStart } from "@/lib/dates";
import { AddSourceDialog } from "./add-source-dialog";
import { IncomeDialog } from "./income-dialog";
import { IncomeQuickForm } from "./income-quick-form";
import {
  buildIncomeSummary,
  incomePaymentStatusLabel,
  normalizeIncomePaymentStatus,
  relatedSourceName,
  type IncomeSummaryTeamEntry,
  type IncomeSummaryTransaction,
} from "./income-summary";
import { DeleteIncomeButton } from "./delete-income-button";

type IncomePageTransaction = IncomeSummaryTransaction & {
  date: string;
  description: string | null;
  amount: number;
  currency: string;
  fx_rate: number;
  status: string | null;
};

function queryErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Unknown query error";
}

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? monthStart();
  const [start, end] = monthRange(month);

  const supabase = await createClient();
  const [
    { data: sources, error: sourcesError },
    { data: incomeTx, error: incomeTxError },
    { data: teamEntries, error: teamEntriesError },
    { data: summary, error: summaryError },
  ] = await Promise.all([
    supabase.from("income_sources").select("id, name, type, visible_in_active_breakdown").eq("active", true).order("name"),
    supabase
      .from("income_transactions")
      .select(
        "id, income_source_id, date, description, amount, currency, fx_rate, amount_idr, status, payment_status, total_hours, income_source:income_sources(name, type)"
      )
      .gte("date", start)
      .lt("date", end)
      .order("date", { ascending: false }),
    supabase
      .from("team_work_entries")
      .select("id, income_source_id, amount_idr, hours, income_source:income_sources(name, type)")
      .gte("date", start)
      .lt("date", end),
    supabase.from("monthly_finance_summary_v3").select("*").eq("month", month).maybeSingle(),
  ]);

  const queryErrors = [
    ["income sources", sourcesError],
    ["income transactions", incomeTxError],
    ["team work entries", teamEntriesError],
    ["monthly summary", summaryError],
  ]
    .filter(([, error]) => error)
    .map(([label, error]) => `${label}: ${queryErrorMessage(error)}`);

  if (queryErrors.length > 0) {
    throw new Error(`Failed to load income page data (${queryErrors.join("; ")})`);
  }

  const sourceList = sources ?? [];
  const incomeList = (incomeTx ?? []) as IncomePageTransaction[];
  const incomeSummary = buildIncomeSummary({
    incomeTransactions: incomeList,
    teamEntries: (teamEntries ?? []) as IncomeSummaryTeamEntry[],
  });
  const hiddenActiveClientIncomeIdr = summary?.active_hidden_income_idr ?? 0;
  const inactiveHistoricalClientIncomeIdr = Math.max(
    (summary?.freelance_client_income_idr ?? 0) -
      (summary?.active_visible_income_idr ?? 0) -
      hiddenActiveClientIncomeIdr,
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">Income</h2>
        <div className="flex items-center gap-2">
          <MonthPicker month={month} />
          <AddSourceDialog triggerLabel="Add client" />
        </div>
      </div>

      <IncomeQuickForm key={month} sources={sourceList} selectedMonth={month} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net active clients</CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={summary?.active_visible_income_idr ?? 0} className="text-xl font-semibold" />
            <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              <p>After Team deduction</p>
              <p>
                Hidden active: <Money amountIdr={hiddenActiveClientIncomeIdr} />
              </p>
              <p>
                Historical inactive: <Money amountIdr={inactiveHistoricalClientIncomeIdr} />
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Digital product</CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={summary?.digital_product_income_idr ?? 0} className="text-xl font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Other</CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={summary?.other_income_idr ?? 0} className="text-xl font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly income gross</CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={summary?.total_income_idr ?? 0} className="text-xl font-semibold" />
            {summary?.monthly_rollup_income_idr ? (
              <p className="mt-1 text-xs text-muted-foreground">From monthly rollup</p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Before Team payout</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={incomeSummary.paidAmountIdr} className="text-xl font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Waiting</CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={incomeSummary.waitingAmountIdr} className="text-xl font-semibold" />
          </CardContent>
        </Card>
      </div>
      <p className="text-sm text-muted-foreground">
        Monthly income is gross income before Team payout. Client summary shows Gross money, Team money, and Net money so your own income is visible after Team deduction.
      </p>

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
                <TableHead className="text-right">Net money</TableHead>
                <TableHead className="text-right">Net time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomeSummary.clientRows.map((row) => (
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
                    <Money amountIdr={row.netAmountIdr} signed />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.netHours.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {incomeSummary.clientRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No freelance client income this month yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomeList.map((t) => {
                const paymentStatus = normalizeIncomePaymentStatus(t.payment_status, t.status);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">{t.date}</TableCell>
                    <TableCell>{relatedSourceName(t.income_source)}</TableCell>
                    <TableCell className="text-muted-foreground">{t.description}</TableCell>
                    <TableCell>
                      <Badge variant={paymentStatus === "waiting" ? "outline" : "secondary"}>
                        {incomePaymentStatusLabel(paymentStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{t.total_hours?.toLocaleString() ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <Money amountIdr={t.amount_idr} />
                    </TableCell>
                    <TableCell className="flex items-center justify-end gap-1">
                      <IncomeDialog
                        sources={sourceList}
                        income={t}
                        trigger={
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        }
                      />
                      <DeleteIncomeButton id={t.id} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {incomeList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No income logged this month yet.
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
