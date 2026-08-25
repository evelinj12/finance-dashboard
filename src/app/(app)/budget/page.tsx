import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/money";
import { MonthPicker } from "@/components/month-picker";
import { createClient } from "@/lib/supabase/server";
import { monthRange, monthStart, shiftMonth } from "@/lib/dates";
import { budgetActualFromTransaction, budgetDifference } from "@/lib/finance/budget-summary";
import { calculateSavingHealth, savingHealthPercent, savingHealthStatus } from "@/lib/finance/monthly-summary";
import { ratioTrend } from "@/lib/finance/team-net";
import type { CategoryTag } from "@/lib/supabase/types";
import { EditBudgetsDialog } from "./edit-budgets-dialog";

const tagLabels: Record<string, string> = {
  income: "Income",
  sinking_fund: "Sinking Funds",
  fixed: "Fixed Expenses",
  spent: "Variable Spending",
};

const tagOrder: CategoryTag[] = ["income", "sinking_fund", "fixed", "spent"];

function RatioTrend({ trend }: { trend: ReturnType<typeof ratioTrend> }) {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
        <ArrowUpRight className="size-4" aria-hidden="true" />
        vs previous month
      </span>
    );
  }

  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600 dark:text-red-400">
        <ArrowDownRight className="size-4" aria-hidden="true" />
        vs previous month
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <Minus className="size-4" aria-hidden="true" />
      vs previous month
    </span>
  );
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? monthStart();
  const previousMonth = shiftMonth(month, -1);
  const [start, end] = monthRange(month);

  const supabase = await createClient();
  const [
    { data: categories },
    { data: budgets },
    { data: transactions },
    { data: sinkingFunds },
    { data: summary },
    { data: previousSummary },
  ] = await Promise.all([
      supabase.from("categories").select("id, name, tag").eq("active", true).order("sort_order"),
      supabase.from("budgets").select("category_id, budget_amount").eq("month", month),
      supabase
        .from("transactions")
        .select("category_id, direction, amount_idr")
        .gte("date", start)
        .lt("date", end),
      supabase.from("sinking_funds").select("name, monthly_amount, due_date, rolling, notes").order("due_date"),
      supabase
        .from("monthly_finance_summary_v3")
        .select("*")
        .eq("month", month)
        .maybeSingle(),
      supabase
        .from("monthly_finance_summary_v3")
        .select("*")
        .eq("month", previousMonth)
        .maybeSingle(),
    ]);

  const budgetByCategory = new Map((budgets ?? []).map((b) => [b.category_id, b.budget_amount]));
  const tagByCategory = new Map((categories ?? []).map((c) => [c.id, c.tag as CategoryTag]));
  const actualByCategory = new Map<string, number>();
  for (const t of transactions ?? []) {
    const tag = tagByCategory.get(t.category_id);
    if (!tag) continue;
    const actual = budgetActualFromTransaction(tag, t.direction, t.amount_idr);
    actualByCategory.set(t.category_id, (actualByCategory.get(t.category_id) ?? 0) + actual);
  }

  const rows = (categories ?? []).map((c) => ({
    ...c,
    budget: budgetByCategory.get(c.id) ?? 0,
    actual: actualByCategory.get(c.id) ?? 0,
  }));

  const grouped = tagOrder.map((tag) => ({
    tag,
    rows: rows.filter((r) => r.tag === tag),
  }));
  const savingHealth = summary
    ? calculateSavingHealth({
        totalIncomeIdr: summary.total_income_idr,
        trueExpensesIdr: summary.true_expenses_idr,
        sinkingFundsIdr: summary.sinking_funds_idr,
      })
    : null;
  const previousSavingHealth = previousSummary
    ? calculateSavingHealth({
        totalIncomeIdr: previousSummary.total_income_idr,
        trueExpensesIdr: previousSummary.true_expenses_idr,
        sinkingFundsIdr: previousSummary.sinking_funds_idr,
      })
    : null;
  const savingHealthIdentified = summary?.saving_health_identified ?? false;
  const previousSavingHealthIdentified = previousSummary?.saving_health_identified ?? false;
  const status = savingHealthStatus(
    savingHealth?.savingHealthRatio ?? 0,
    savingHealth?.netAfterSavingsIdr ?? 0,
    savingHealthIdentified,
  );
  const trend = ratioTrend(
    savingHealthIdentified ? savingHealth?.savingHealthRatio ?? null : null,
    previousSavingHealthIdentified ? previousSavingHealth?.savingHealthRatio ?? null : null,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">Budget Checker</h2>
        <div className="flex items-center gap-2">
          <MonthPicker month={month} />
          <EditBudgetsDialog
            month={month}
            categories={rows.map((r) => ({ id: r.id, name: r.name, tag: r.tag, budget: r.budget }))}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saving Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Income</p>
              <Money amountIdr={summary?.total_income_idr ?? 0} className="text-lg font-semibold" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">True expenses</p>
              <Money amountIdr={summary?.true_expenses_idr ?? 0} className="text-lg font-semibold" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sinking funds</p>
              <Money amountIdr={summary?.sinking_funds_idr ?? 0} className="text-lg font-semibold" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ratio</p>
              {savingHealthIdentified ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold">
                    {savingHealthPercent(savingHealth?.savingHealthRatio ?? 0)}
                  </p>
                  <RatioTrend trend={trend} />
                </div>
              ) : (
                <p className="text-lg font-semibold text-muted-foreground">Unidentified</p>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge
              variant="outline"
              className={
                status === "On target"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                  : status === "Below target"
                    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                    : ""
              }
            >
              {status}
            </Badge>
            <span>Target: more than 50%</span>
          </div>
        </CardContent>
      </Card>

      {grouped.map(({ tag, rows: tagRows }) => {
        if (tagRows.length === 0) return null;
        const totalBudget = tagRows.reduce((s, r) => s + r.budget, 0);
        const totalActual = tagRows.reduce((s, r) => s + r.actual, 0);
        return (
          <Card key={tag}>
            <CardHeader>
              <CardTitle>{tagLabels[tag] ?? tag}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tagRows.map((r) => {
                    const diff = budgetDifference(tag, r.budget, r.actual);
                    return (
                      <TableRow key={r.id}>
                        <TableCell>{r.name}</TableCell>
                        <TableCell className="text-right">
                          <Money amountIdr={r.budget} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Money amountIdr={r.actual} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Money amountIdr={diff} signed />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="font-medium">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      <Money amountIdr={totalBudget} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money amountIdr={totalActual} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money
                        amountIdr={budgetDifference(tag, totalBudget, totalActual)}
                        signed
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle>Sinking fund schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fund</TableHead>
                <TableHead className="text-right">Monthly</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sinkingFunds ?? []).map((f) => (
                <TableRow key={f.name}>
                  <TableCell>{f.name}</TableCell>
                  <TableCell className="text-right">
                    <Money amountIdr={f.monthly_amount} />
                  </TableCell>
                  <TableCell>
                    {f.rolling
                      ? "Rolling"
                      : f.due_date
                        ? new Date(f.due_date).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{f.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
