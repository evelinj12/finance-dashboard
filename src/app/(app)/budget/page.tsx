import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/money";
import { MonthPicker } from "@/components/month-picker";
import { createClient } from "@/lib/supabase/server";
import { monthRange, monthStart } from "@/lib/dates";
import { budgetActualFromTransaction, budgetDifference } from "@/lib/finance/budget-summary";
import { calculateSavingHealth, savingHealthPercent, savingHealthStatus } from "@/lib/finance/monthly-summary";
import type { CategoryTag } from "@/lib/supabase/types";
import { EditBudgetsDialog } from "./edit-budgets-dialog";

const tagLabels: Record<string, string> = {
  income: "Income",
  sinking_fund: "Sinking Funds",
  fixed: "Fixed Expenses",
  spent: "Variable Spending",
};

const tagOrder: CategoryTag[] = ["income", "sinking_fund", "fixed", "spent"];

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? monthStart();
  const [start, end] = monthRange(month);

  const supabase = await createClient();
  const [{ data: categories }, { data: budgets }, { data: transactions }, { data: sinkingFunds }, { data: summary }] =
    await Promise.all([
      supabase.from("categories").select("id, name, tag").eq("active", true).order("sort_order"),
      supabase.from("budgets").select("category_id, budget_amount").eq("month", month),
      supabase
        .from("transactions")
        .select("category_id, direction, amount_idr")
        .gte("date", start)
        .lt("date", end),
      supabase.from("sinking_funds").select("name, monthly_amount, due_date, rolling, notes").order("due_date"),
      supabase
        .from("monthly_finance_summary")
        .select("*")
        .eq("month", month)
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
              <p className="text-lg font-semibold">
                {savingHealthPercent(savingHealth?.savingHealthRatio ?? 0)}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {savingHealthStatus(
              savingHealth?.savingHealthRatio ?? 0,
              savingHealth?.netAfterSavingsIdr ?? 0,
            )} · Target: more than 50%
          </p>
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
