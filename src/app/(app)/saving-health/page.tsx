import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/money";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMonthLabel, monthStart, shiftMonth } from "@/lib/dates";
import { savingHealthPercent, savingHealthStatus } from "@/lib/finance/monthly-summary";
import { createClient } from "@/lib/supabase/server";

const HISTORY_START_MONTH = "2025-01-01";

function monthHistory(startMonth: string, endMonth: string) {
  const months: string[] = [];
  let cursor = endMonth;
  while (cursor >= startMonth) {
    months.push(cursor);
    cursor = shiftMonth(cursor, -1);
  }
  return months;
}

export default async function SavingHealthPage() {
  const supabase = await createClient();
  const currentMonth = monthStart();

  const { data: summaries } = await supabase
    .from("monthly_finance_summary_v3")
    .select("*")
    .gte("month", HISTORY_START_MONTH)
    .order("month", { ascending: false });
  const summariesByMonth = new Map((summaries ?? []).map((row) => [row.month, row]));
  const months = monthHistory(HISTORY_START_MONTH, currentMonth);

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
              {months.map((month) => {
                const row = summariesByMonth.get(month);
                const identified = row?.saving_health_identified ?? false;
                const ratio = row?.saving_health_ratio ?? 0;
                const progressValue = identified ? Math.min(100, Math.max(0, ratio * 100)) : 0;
                const status = savingHealthStatus(
                  ratio,
                  row?.net_after_savings_idr ?? 0,
                  identified,
                );

                return (
                  <TableRow key={month}>
                    <TableCell>
                      <div className="font-medium">{formatMonthLabel(month)}</div>
                      {month === currentMonth ? (
                        <div className="text-xs text-muted-foreground">month-to-date</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <Money amountIdr={row?.total_income_idr ?? 0} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money amountIdr={row?.true_expenses_idr ?? 0} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money amountIdr={row?.sinking_funds_idr ?? 0} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money amountIdr={row?.net_after_savings_idr ?? 0} signed />
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-36 items-center gap-3">
                        <Progress value={progressValue} className="flex-1" />
                        <span className="w-10 text-right text-sm tabular-nums">
                          {identified ? savingHealthPercent(ratio) : "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          status === "On target"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                            : status === "Below target"
                              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                              : "text-muted-foreground"
                        }
                      >
                        {status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {months.length === 0 && (
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
