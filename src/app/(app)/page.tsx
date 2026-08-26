import type { ComponentType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ReceiptText,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { DashboardMonthSelect, NetWorthRangeSelect } from "@/components/dashboard-filter-selects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CategorySpendingChart } from "@/components/category-spending-chart";
import { CatMascot, CoinStack, WalletIllustration } from "@/components/cozy-illustrations";
import { GoalProgressDonut } from "@/components/goal-progress-donut";
import { Money } from "@/components/money";
import { NetWorthTrendChart } from "@/components/net-worth-trend-chart";
import { TimeGreeting } from "@/components/time-greeting";
import { createClient } from "@/lib/supabase/server";
import { formatMonthLabel, monthRange, monthStart, shiftMonth } from "@/lib/dates";
import { savingHealthPercent, savingHealthStatus } from "@/lib/finance/monthly-summary";

type NetWorthRange = "6m" | "12m" | "ytd" | "all";

const netWorthRanges = new Set<string>(["6m", "12m", "ytd", "all"]);

function normalizeMonthParam(month: string | undefined) {
  return month && /^\d{4}-\d{2}-01$/.test(month) ? month : monthStart();
}

function normalizeRangeParam(range: string | undefined): NetWorthRange {
  return netWorthRanges.has(range ?? "") ? (range as NetWorthRange) : "12m";
}

function firstCategory(value: unknown): { name?: string | null; tag?: string | null; sort_order?: number | null } | null {
  if (Array.isArray(value)) {
    return firstCategory(value[0]);
  }
  if (value && typeof value === "object") {
    return value as { name?: string | null; tag?: string | null; sort_order?: number | null };
  }
  return null;
}

function filterNetWorthRows(
  rows: { month: string; net_worth: number }[],
  selectedMonth: string,
  range: NetWorthRange,
) {
  const startMonth =
    range === "all"
      ? null
      : range === "ytd"
        ? `${selectedMonth.slice(0, 4)}-01-01`
        : shiftMonth(selectedMonth, range === "6m" ? -5 : -11);

  return rows.filter((row) => {
    return row.month <= selectedMonth && (!startMonth || row.month >= startMonth);
  });
}

function QuickLogCard({
  href,
  title,
  description,
  accent,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  accent: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-28 items-center justify-between gap-4 rounded-lg border border-sky-100 bg-white/75 p-4 shadow-sm shadow-sky-950/5 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white hover:shadow-md hover:shadow-sky-950/10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
    >
      <div className="flex items-center gap-3">
        <span className={`flex size-11 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="size-5" />
        </span>
        <span>
          <span className="block font-semibold text-foreground">{title}</span>
          <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
        </span>
      </div>
      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

function SavingHealthDonut({ progress, label }: { progress: number; label: string }) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const labelClassName = label.length > 4 ? "text-lg" : "text-3xl";
  const helperLabel = label.length > 4 ? "status" : "saved";

  return (
    <div
      aria-label={`Saving health ${label}`}
      className="relative grid size-36 place-items-center rounded-full shadow-sm shadow-sky-950/10"
      role="img"
      style={{
        background: `conic-gradient(var(--primary) ${clampedProgress}%, rgba(255,255,255,.9) 0)`,
      }}
    >
      <div className="grid size-24 place-items-center rounded-full bg-white">
        <div className="text-center">
          <p className={`${labelClassName} font-bold money-figures`}>{label}</p>
          <p className="text-xs font-semibold text-muted-foreground">{helperLabel}</p>
        </div>
      </div>
    </div>
  );
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; netWorthRange?: string }>;
}) {
  const { month: monthParam, netWorthRange } = await searchParams;
  const supabase = await createClient();
  const month = normalizeMonthParam(monthParam);
  const selectedYear = Number(month.slice(0, 4));
  const selectedNetWorthRange = normalizeRangeParam(netWorthRange);
  const [selectedMonthStart, selectedNextMonthStart] = monthRange(month);

  const [
    { data: summary },
    { data: summaryMonths },
    { data: netWorthHistory },
    { data: goal },
    { data: sinkingFunds },
    { data: spendingTransactions },
  ] = await Promise.all([
      supabase
        .from("monthly_finance_summary_v3")
        .select("*")
        .eq("month", month)
        .maybeSingle(),
      supabase
        .from("monthly_finance_summary_v3")
        .select("month")
        .order("month", { ascending: false })
        .limit(36),
      supabase
        .from("net_worth_snapshots")
        .select("month, net_worth")
        .order("month", { ascending: true }),
      supabase.from("goals").select("target_amount").eq("type", "net_worth").eq("year", selectedYear).maybeSingle(),
      supabase
        .from("sinking_funds")
        .select("name, due_date, monthly_amount")
        .not("due_date", "is", null)
        .order("due_date", { ascending: true })
        .limit(4),
      supabase
        .from("transactions")
        .select("id, amount_idr, category:categories(name, tag, sort_order)")
        .eq("direction", "out")
        .gte("date", selectedMonthStart)
        .lt("date", selectedNextMonthStart),
    ]);

  const incomeActual = summary?.total_income_idr ?? 0;
  const incomeBudget = summary?.income_budget_idr ?? 0;
  const trueExpensesActual = summary?.true_expenses_idr ?? 0;
  const trueExpensesBudget = (summary?.fixed_budget_idr ?? 0) + (summary?.variable_budget_idr ?? 0);
  const savingHealthRatio = summary?.saving_health_ratio ?? 0;
  const savingHealthIdentified = summary?.saving_health_identified ?? false;
  const teamPaidThisMonth = summary?.team_paid_idr ?? 0;
  const teamOwedThisMonth = summary?.team_owed_idr ?? 0;
  const teamTotalThisMonth = summary?.team_total_idr ?? 0;
  const netAfterSavings = summary?.net_after_savings_idr ?? 0;
  const incomeBySourceType = {
    freelance_client: summary?.freelance_client_income_idr ?? 0,
    digital_product: summary?.digital_product_income_idr ?? 0,
    other: summary?.other_income_idr ?? 0,
  };

  const netWorthRows = netWorthHistory ?? [];
  const netWorthTrendRows = filterNetWorthRows(netWorthRows, month, selectedNetWorthRange);
  const latestNetWorth = netWorthRows.filter((row) => row.month <= month).at(-1)?.net_worth ?? 0;
  const goalTarget = goal?.target_amount ?? 0;
  const goalProgressPct = goalTarget > 0 ? Math.min(100, Math.max(0, (latestNetWorth / goalTarget) * 100)) : 0;
  const availableMonths = (summaryMonths ?? []).map((row) => row.month);
  const savingPercent = savingHealthIdentified ? savingHealthPercent(savingHealthRatio) : "Unidentified";
  const savingProgress = savingHealthIdentified ? Math.min(100, Math.max(0, savingHealthRatio * 100)) : 0;
  const trueExpensePct =
    trueExpensesBudget > 0 ? Math.min(100, Math.max(0, (trueExpensesActual / trueExpensesBudget) * 100)) : 0;
  const spendingByCategoryMap = new Map<string, { name: string; amountIdr: number; sortOrder: number }>();

  for (const transaction of spendingTransactions ?? []) {
    const category = firstCategory(transaction.category);
    const tag = category?.tag ?? "";

    if (tag !== "fixed" && tag !== "spent") continue;

    const name = category?.name ?? "Uncategorized";
    const existing = spendingByCategoryMap.get(name) ?? {
      name,
      amountIdr: 0,
      sortOrder: category?.sort_order ?? 999,
    };

    existing.amountIdr += transaction.amount_idr ?? 0;
    spendingByCategoryMap.set(name, existing);
  }

  const spendingByCategory = [...spendingByCategoryMap.values()].sort((a, b) => {
    if (b.amountIdr !== a.amountIdr) return b.amountIdr - a.amountIdr;
    return a.sortOrder - b.sortOrder;
  });

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        <Card className="relative overflow-hidden bg-white/80">
          <CardContent className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="mb-4">
                <DashboardMonthSelect month={month} months={availableMonths} />
              </div>
              <TimeGreeting name="Evelin" />
              <p className="mt-2 max-w-xl text-base text-muted-foreground">
                {savingHealthIdentified
                  ? `Saving health is ${savingPercent} for ${formatMonthLabel(month)}.`
                  : "This month has unidentified data, so the saving health needs a closer look."}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <QuickLogCard
                  href="/transactions"
                  title="Quick transaction"
                  description="Log spending"
                  accent="bg-sky-100 text-sky-700"
                  icon={ReceiptText}
                />
                <QuickLogCard
                  href="/income"
                  title="Quick income"
                  description="Paid or waiting"
                  accent="bg-emerald-100 text-emerald-700"
                  icon={WalletCards}
                />
                <QuickLogCard
                  href="/team"
                  title="Team payout"
                  description="Track owed and paid"
                  accent="bg-orange-100 text-orange-700"
                  icon={Users}
                />
              </div>
            </div>
            <div className="hidden min-w-40 justify-center md:flex">
              <WalletIllustration className="w-44" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[color:var(--surface-blue)]">
          <CardContent className="flex h-full flex-col gap-5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Saving Health</p>
                <p className="mt-1 text-4xl font-bold money-figures">{savingPercent}</p>
              </div>
              <span className="rounded-full border border-sky-100 bg-white px-3 py-1 text-sm font-semibold text-sky-700 shadow-sm">
                Goal &gt; 50%
              </span>
            </div>
            <div className="grid flex-1 items-center gap-4 sm:grid-cols-[auto_1fr] lg:grid-cols-1 xl:grid-cols-[auto_1fr]">
              <SavingHealthDonut progress={savingProgress} label={savingPercent} />
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                {savingHealthIdentified
                  ? `${savingHealthStatus(savingHealthRatio, netAfterSavings)} - Target: more than 50%`
                  : "Waiting for complete income and budget data."}
                </p>
                <CatMascot className="w-28" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <WalletCards className="size-4 text-emerald-600" />
              Monthly income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={incomeActual} className="text-2xl font-bold money-figures" />
            <p className="mt-1 text-xs text-muted-foreground">
              Budget <Money amountIdr={incomeBudget} />
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <ReceiptText className="size-4 text-red-600" />
              True expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={trueExpensesActual} className="text-2xl font-bold money-figures" />
            <Progress value={trueExpensePct} className="mt-3" />
            <p className="mt-2 text-xs text-muted-foreground">
              Budget <Money amountIdr={trueExpensesBudget} />
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <ShieldCheck className="size-4 text-sky-600" />
              Monthly excess
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={netAfterSavings} signed className="text-2xl font-bold money-figures" />
            <p className="mt-1 text-xs text-muted-foreground">Income minus true expenses and sinking funds</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Users className="size-4 text-orange-600" />
              Team payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={teamTotalThisMonth} className="text-2xl font-bold money-figures" />
            <p className="mt-1 text-xs text-muted-foreground">
              Paid <Money amountIdr={teamPaidThisMonth} /> - Owed <Money amountIdr={teamOwedThisMonth} /> -{" "}
              <Link href="/team" className="underline underline-offset-2">
                View team
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-sky-100">
            <CardTitle className="flex flex-wrap items-center justify-between gap-3">
              <span>Net worth trend</span>
              <NetWorthRangeSelect value={selectedNetWorthRange} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {netWorthTrendRows.length > 0 ? (
              <NetWorthTrendChart data={netWorthTrendRows.map((n) => ({ month: n.month, netWorthIdr: n.net_worth }))} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No net worth snapshots in this range.{" "}
                <Link href="/networth" className="underline underline-offset-2">
                  Add one
                </Link>
                .
              </p>
            )}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Net worth through {formatMonthLabel(month)}</span>
              <Money amountIdr={latestNetWorth} className="font-bold money-figures" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-b from-white to-sky-50/70">
          <CardHeader>
            <CardTitle>{selectedYear} goal</CardTitle>
          </CardHeader>
          <CardContent>
            {goalTarget > 0 ? (
              <GoalProgressDonut
                currentAmountIdr={latestNetWorth}
                progressPct={goalProgressPct}
                targetAmountIdr={goalTarget}
                year={selectedYear}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No {selectedYear} net worth goal set.{" "}
                <Link href="/settings" className="underline underline-offset-2">
                  Set one
                </Link>
                .
              </p>
            )}
            {goalTarget > 0 ? null : <CoinStack className="mt-4 ml-auto w-28" />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b border-sky-100">
          <CardTitle className="flex flex-wrap items-end justify-between gap-2">
            <span>Amount vs. Category</span>
            <span className="text-sm font-normal text-muted-foreground">{formatMonthLabel(month)}</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            True expenses by category. Sinking funds are tracked separately.
          </p>
        </CardHeader>
        <CardContent>
          <CategorySpendingChart data={spendingByCategory} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Income by source</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex justify-between rounded-lg bg-sky-50 px-3 py-2 text-sm">
              <span>Freelance clients</span>
              <Money amountIdr={incomeBySourceType.freelance_client} />
            </div>
            <div className="flex justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm">
              <span>Digital products</span>
              <Money amountIdr={incomeBySourceType.digital_product} />
            </div>
            <div className="flex justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm">
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
                <div
                  key={f.name}
                  className="flex items-center justify-between gap-3 rounded-lg border border-sky-100 bg-white/70 px-3 py-2 text-sm"
                >
                  <span>
                    {f.name}
                    {f.due_date ? (
                      <span className="text-muted-foreground">
                        {" "}
                        -{" "}
                        {new Date(f.due_date).toLocaleDateString("en-US", {
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
