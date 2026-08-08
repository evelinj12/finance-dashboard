import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/money";
import { MonthPicker } from "@/components/month-picker";
import { createClient } from "@/lib/supabase/server";
import { monthRange, monthStart } from "@/lib/dates";
import { AddSourceDialog } from "./add-source-dialog";
import { IncomeDialog } from "./income-dialog";
import { DeleteIncomeButton } from "./delete-income-button";

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? monthStart();
  const [start, end] = monthRange(month);

  const supabase = await createClient();
  const [{ data: sources }, { data: incomeTx }, { data: summary }] = await Promise.all([
    supabase
      .from("income_sources")
      .select("id, name, type, visible_in_active_breakdown")
      .eq("active", true)
      .order("name"),
    supabase
      .from("income_transactions")
      .select(
        "id, income_source_id, date, description, amount, currency, fx_rate, amount_idr, status, income_source:income_sources(name, type)"
      )
      .gte("date", start)
      .lt("date", end)
      .order("date", { ascending: false }),
    supabase.from("monthly_finance_summary_v2").select("*").eq("month", month).maybeSingle(),
  ]);

  const sourceList = sources ?? [];
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
          <AddSourceDialog />
          <IncomeDialog
            sources={sourceList}
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Add
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Visible active clients</CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={summary?.active_visible_income_idr ?? 0} className="text-xl font-semibold" />
            <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly income</CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={summary?.total_income_idr ?? 0} className="text-xl font-semibold" />
            {summary?.monthly_rollup_income_idr ? (
              <p className="mt-1 text-xs text-muted-foreground">From monthly rollup</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <p className="text-sm text-muted-foreground">
        Monthly income follows the imported rollup when available; detailed rows remain available for source analysis and exports.
      </p>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(incomeTx ?? []).map((t) => {
                const source = t.income_source as unknown as { name: string } | { name: string }[] | null;
                const sourceName = Array.isArray(source) ? source[0]?.name : source?.name;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">{t.date}</TableCell>
                    <TableCell>{sourceName}</TableCell>
                    <TableCell className="text-muted-foreground">{t.description}</TableCell>
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
              {(!incomeTx || incomeTx.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
