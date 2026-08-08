import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money";
import { NetWorthTrendChart } from "@/components/net-worth-trend-chart";
import { createClient } from "@/lib/supabase/server";
import { formatMonthLabel, monthRange, monthStart } from "@/lib/dates";

export default async function OverviewPage() {
  const supabase = await createClient();
  const month = monthStart();
  const [start, end] = monthRange(month);
  const currentYear = new Date().getFullYear();

  const [
    { data: categories },
    { data: budgets },
    { data: transactions },
    { data: incomeTx },
    { data: contractorPayments },
    { data: netWorthHistory },
    { data: goal },
    { data: sinkingFunds },
  ] = await Promise.all([
    supabase.from("categories").select("id, name, tag"),
    supabase.from("budgets").select("category_id, budget_amount").eq("month", month),
    supabase
      .from("transactions")
      .select("category_id, direction, amount_idr")
      .gte("date", start)
      .lt("date", end),
    supabase
      .from("income_transactions")
      .select("amount_idr, income_source:income_sources(type)")
      .gte("date", start)
      .lt("date", end),
    supabase
      .from("contractor_payments")
      .select("amount_idr")
      .gte("date", start)
      .lt("date", end),
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

  const categoryTagById = new Map((categories ?? []).map((c) => [c.id, c.tag]));

  const actualByTag = { income: 0, sinking_fund: 0, fixed: 0, spent: 0 } as Record<string, number>;
  for (const t of transactions ?? []) {
    const tag = categoryTagById.get(t.category_id);
    if (!tag) continue;
    const signed = t.direction === "in" ? t.amount_idr : -t.amount_idr;
    actualByTag[tag] = (actualByTag[tag] ?? 0) + signed;
  }

  const budgetByTag = { income: 0, sinking_fund: 0, fixed: 0, spent: 0 } as Record<string, number>;
  for (const b of budgets ?? []) {
    const tag = categoryTagById.get(b.category_id);
    if (!tag) continue;
    budgetByTag[tag] = (budgetByTag[tag] ?? 0) + b.budget_amount;
  }

  const incomeActual = actualByTag.income;
  const fixedActual = actualByTag.fixed;
  const spentActual = actualByTag.spent;
  const savingsRatio = incomeActual > 0 ? (incomeActual - fixedActual - spentActual) / incomeActual : 0;

  const incomeBySourceType = { freelance_client: 0, digital_product: 0, other: 0 } as Record<
    string,
    number
  >;
  for (const row of incomeTx ?? []) {
    const source = row.income_source as unknown as { type: string } | { type: string }[] | null;
    const type = Array.isArray(source) ? source[0]?.type : source?.type;
    if (!type) continue;
    incomeBySourceType[type] = (incomeBySourceType[type] ?? 0) + row.amount_idr;
  }

  const brotherPaidThisMonth = (contractorPayments ?? []).reduce((sum, p) => sum + p.amount_idr, 0);

  const latestNetWorth = netWorthHistory?.[netWorthHistory.length - 1]?.net_worth ?? 0;
  const goalTarget = goal?.target_amount ?? 0;
  const goalProgressPct = goalTarget > 0 ? Math.min(100, Math.max(0, (latestNetWorth / goalTarget) * 100)) : 0;

  const savingsRatioLabel =
    savingsRatio >= 0.3 ? "Healthy" : savingsRatio >= 0.15 ? "Watch it" : "Below target";

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
              Income this month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={incomeActual} className="text-2xl font-semibold" />
            <p className="text-xs text-muted-foreground mt-1">
              Budget <Money amountIdr={budgetByTag.income} />
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fixed + Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={fixedActual + spentActual} className="text-2xl font-semibold" />
            <p className="text-xs text-muted-foreground mt-1">
              Budget <Money amountIdr={budgetByTag.fixed + budgetByTag.spent} />
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Savings ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{(savingsRatio * 100).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground mt-1">{savingsRatioLabel}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid to brother
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={brotherPaidThisMonth} className="text-2xl font-semibold" />
            <p className="text-xs text-muted-foreground mt-1">
              <Link href="/brother" className="underline underline-offset-2">
                View log
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
