import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money";
import { NetWorthTrendChart } from "@/components/net-worth-trend-chart";
import { createClient } from "@/lib/supabase/server";
import { formatMonthLabel, monthStart } from "@/lib/dates";
import { savingHealthPercent, savingHealthStatus } from "@/lib/finance/monthly-summary";

export default async function OverviewPage() {
  const supabase = await createClient();
  const month = monthStart();
  const currentYear = new Date().getFullYear();

  const [
    { data: summary },
    { data: netWorthHistory },
    { data: goal },
    { data: sinkingFunds },
  ] = await Promise.all([
    supabase
      .from("monthly_finance_summary_v3")
      .select("*")
      .eq("month", month)
      .maybeSingle(),
    supabase
      .from("net_worth_snapshots")
      .select("month, net_worth")
      .order("month", { ascending: true })
      .limit(12),
    supabase.from("goals").select("target_amount").eq("type", "net_worth").eq("year", currentYear).maybeSingle(),
    supabase
      .from("sinking_funds")
      .select("name, due_date, monthly_amount")
      .not("due_date", "is", null)
      .order("due_date", { ascending: true })
      .limit(4),
  ]);

  const incomeActual = summary?.total_income_idr ?? 0;
  const incomeBudget = summary?.income_budget_idr ?? 0;
  const trueExpensesActual = summary?.true_expenses_idr ?? 0;
  const trueExpensesBudget = (summary?.fixed_budget_idr ?? 0) + (summary?.variable_budget_idr ?? 0);
  const savingHealthRatio = summary?.saving_health_ratio ?? 0;
  const teamPaidThisMonth = summary?.team_paid_idr ?? 0;
  const teamOwedThisMonth = summary?.team_owed_idr ?? 0;
  const teamTotalThisMonth = summary?.team_total_idr ?? 0;
  const incomeBySourceType = {
    freelance_client: summary?.freelance_client_income_idr ?? 0,
    digital_product: summary?.digital_product_income_idr ?? 0,
    other: summary?.other_income_idr ?? 0,
  };

  const latestNetWorth = netWorthHistory?.[netWorthHistory.length - 1]?.net_worth ?? 0;
  const goalTarget = goal?.target_amount ?? 0;
  const goalProgressPct = goalTarget > 0 ? Math.min(100, Math.max(0, (latestNetWorth / goalTarget) * 100)) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">{formatMonthLabel(month)}</h2>
        <div className="flex gap-2">
          <Button size="sm" render={<Link href="/transactions">+ Transaction</Link>} />
          <Button size="sm" variant="outline" render={<Link href="/income">+ Income</Link>} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Income month-to-date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={incomeActual} className="text-2xl font-semibold" />
            <p className="text-xs text-muted-foreground mt-1">
              Budget <Money amountIdr={incomeBudget} />
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              True expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={trueExpensesActual} className="text-2xl font-semibold" />
            <p className="text-xs text-muted-foreground mt-1">
              Budget <Money amountIdr={trueExpensesBudget} />
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saving health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{savingHealthPercent(savingHealthRatio)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {savingHealthStatus(savingHealthRatio, summary?.net_after_savings_idr ?? 0)} · Target: more than 50%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Team payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={teamTotalThisMonth} className="text-2xl font-semibold" />
            <p className="text-xs text-muted-foreground mt-1">
              Paid <Money amountIdr={teamPaidThisMonth} /> · Owed <Money amountIdr={teamOwedThisMonth} /> ·{" "}
              <Link href="/team" className="underline underline-offset-2">
                View team
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Net worth trend</CardTitle>
          </CardHeader>
          <CardContent>
            {netWorthHistory && netWorthHistory.length > 0 ? (
              <NetWorthTrendChart
                data={netWorthHistory.map((n) => ({ month: n.month, netWorthIdr: n.net_worth }))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No net worth snapshots yet.{" "}
                <Link href="/networth" className="underline underline-offset-2">
                  Add one
                </Link>
                .
              </p>
            )}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current net worth</span>
              <Money amountIdr={latestNetWorth} className="font-semibold" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{currentYear} goal</CardTitle>
          </CardHeader>
          <CardContent>
            {goalTarget > 0 ? (
              <>
                <Progress value={goalProgressPct} className="mb-2" />
                <p className="text-sm text-muted-foreground">
                  <Money amountIdr={latestNetWorth} /> of <Money amountIdr={goalTarget} /> (
                  {goalProgressPct.toFixed(0)}%)
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No {currentYear} net worth goal set.{" "}
                <Link href="/settings" className="underline underline-offset-2">
                  Set one
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Income by source</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span>Freelance clients</span>
              <Money amountIdr={incomeBySourceType.freelance_client} />
            </div>
            <div className="flex justify-between text-sm">
              <span>Digital products</span>
              <Money amountIdr={incomeBySourceType.digital_product} />
            </div>
            <div className="flex justify-between text-sm">
              <span>Other</span>
              <Money amountIdr={incomeBySourceType.other} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming sinking fund dues</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {sinkingFunds && sinkingFunds.length > 0 ? (
              sinkingFunds.map((f) => (
                <div key={f.name} className="flex justify-between text-sm">
                  <span>
                    {f.name}
                    {f.due_date ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · {new Date(f.due_date).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    ) : null}
                  </span>
                  <Money amountIdr={f.monthly_amount} />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No sinking funds with a due date.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
