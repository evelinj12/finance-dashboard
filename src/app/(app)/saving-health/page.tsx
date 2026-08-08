import { Money } from "@/components/money";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMonthLabel, monthStart } from "@/lib/dates";
import { savingHealthPercent, savingHealthStatus } from "@/lib/finance/monthly-summary";
import { createClient } from "@/lib/supabase/server";

const HISTORY_START_MONTH = "2025-01-01";

export default async function SavingHealthPage() {
  const supabase = await createClient();
  const currentMonth = monthStart();

  const { data: summaries } = await supabase
    .from("monthly_finance_summary")
    .select("*")
    .gte("month", HISTORY_START_MONTH)
    .order("month", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold">Saving Health</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Target: save more than 50% of income through sinking funds and leftover net.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">True expenses</TableHead>
                <TableHead className="text-right">Sinking funds</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="min-w-40">Ratio</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(summaries ?? []).map((row) => {
                const progressValue = Math.min(100, Math.max(0, row.saving_health_ratio * 100));
                const status = savingHealthStatus(row.saving_health_ratio, row.net_after_savings_idr);

                return (
                  <TableRow key={row.month}>
                    <TableCell>
                      <div className="font-medium">{formatMonthLabel(row.month)}</div>
                      {row.month === currentMonth ? (
                        <div className="text-xs text-muted-foreground">month-to-date</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <Money amountIdr={row.total_income_idr} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money amountIdr={row.true_expenses_idr} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money amountIdr={row.sinking_funds_idr} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money amountIdr={row.net_after_savings_idr} signed />
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-36 items-center gap-3">
                        <Progress value={progressValue} className="flex-1" />
                        <span className="w-10 text-right text-sm tabular-nums">
                          {savingHealthPercent(row.saving_health_ratio)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className={status === "On target" ? "text-emerald-600 dark:text-emerald-400" : ""}>
                      {status}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!summaries || summaries.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No saving health rows yet.
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
