import Link from "next/link";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/money";
import { MonthPicker } from "@/components/month-picker";
import { createClient } from "@/lib/supabase/server";
import { formatMonthLabel, monthRange, monthStart } from "@/lib/dates";
import type { TransactionSource } from "@/lib/supabase/types";
import { TransactionDialog } from "./transaction-dialog";
import { TransactionQuickForm } from "./transaction-quick-form";
import { DeleteTransactionButton } from "./delete-transaction-button";
import { ensureMonthlyRecurringTransactions } from "./actions";

function previousDay(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function isDateString(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

const tagLabels: Record<string, string> = {
  sinking_fund: "Sinking fund",
  fixed: "Fixed",
  spent: "Spent",
  income: "Income",
};

const tagOrder: Record<string, number> = {
  sinking_fund: 1,
  fixed: 2,
  spent: 3,
  income: 4,
};

const sourceLabels: Record<string, string> = {
  all: "All sources",
  manual: "Manual",
  import: "Imported sheet",
  auto_monthly: "Auto monthly",
};

type SourceFilter = TransactionSource | "all";

const sourceValues = new Set<SourceFilter>(["all", "manual", "import", "auto_monthly"]);

function isSourceFilter(value: string | undefined): value is SourceFilter {
  return Boolean(value && sourceValues.has(value as SourceFilter));
}

function tagBadgeClass(tag: string) {
  switch (tag) {
    case "sinking_fund":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "fixed":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "spent":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "income":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function sourceBadgeClass(source: string) {
  if (source === "auto_monthly") return "border-blue-200 bg-blue-50 text-blue-700";
  if (source === "import") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-white text-slate-600";
}

function firstCategory(
  value: unknown
): { name?: string | null; tag?: string | null; sort_order?: number | null } | null {
  if (Array.isArray(value)) {
    return firstCategory(value[0]);
  }
  if (value && typeof value === "object") {
    return value as { name?: string | null; tag?: string | null; sort_order?: number | null };
  }
  return null;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; from?: string; to?: string; source?: string }>;
}) {
  const { month: monthParam, from: fromParam, to: toParam, source: sourceParam } = await searchParams;
  const month = monthParam ?? monthStart();
  const sourceFilter: SourceFilter = isSourceFilter(sourceParam) ? sourceParam : "all";
  const [monthStartDate, nextMonthStartDate] = monthRange(month);
  const defaultEndDate = previousDay(nextMonthStartDate);
  const requestedStart = isDateString(fromParam) ? fromParam : monthStartDate;
  const requestedEnd = isDateString(toParam) ? toParam : defaultEndDate;
  const [start, end] =
    requestedStart <= requestedEnd ? [requestedStart, requestedEnd] : [requestedEnd, requestedStart];
  const dateRangeLabel =
    start === monthStartDate && end === defaultEndDate
      ? `Showing all transactions for ${formatMonthLabel(month)}`
      : `Showing transactions from ${start} to ${end}`;

  await ensureMonthlyRecurringTransactions(month);

  const supabase = await createClient();
  const transactionQuery = supabase
    .from("transactions")
    .select(
      "id, date, category_id, direction, amount, currency, fx_rate, amount_idr, notes, save_to, source, recurring_type, recurring_template_id, generated_month, category:categories(name, tag, sort_order)"
    )
    .gte("date", start)
    .lte("date", end);

  if (sourceFilter !== "all") {
    transactionQuery.eq("source", sourceFilter);
  }

  const [{ data: categories }, { data: transactions }] = await Promise.all([
    supabase.from("categories").select("id, name, tag").eq("active", true).order("sort_order"),
    transactionQuery,
  ]);

  const categoryList = categories ?? [];
  const sortedTransactions = [...(transactions ?? [])].sort((a, b) => {
    const aCategory = firstCategory(a.category);
    const bCategory = firstCategory(b.category);
    const aTag = aCategory?.tag ?? "";
    const bTag = bCategory?.tag ?? "";
    const tagDiff = (tagOrder[aTag] ?? 99) - (tagOrder[bTag] ?? 99);
    if (tagDiff !== 0) return tagDiff;

    const categoryDiff = (aCategory?.sort_order ?? 999) - (bCategory?.sort_order ?? 999);
    if (categoryDiff !== 0) return categoryDiff;

    const dateDiff = b.date.localeCompare(a.date);
    if (dateDiff !== 0) return dateDiff;

    return (a.notes ?? "").localeCompare(b.notes ?? "");
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">Transactions</h2>
        <div className="flex items-center gap-2">
          <MonthPicker month={month} resetParamsOnChange={["from", "to"]} />
        </div>
      </div>

      <TransactionQuickForm key={month} categories={categoryList} selectedMonth={month} />

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-base font-semibold">Date range</h3>
            <p className="text-sm text-muted-foreground">{dateRangeLabel}</p>
          </div>
          <form className="grid gap-3 sm:grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_minmax(150px,1fr)_auto_auto]" action="/transactions">
            <input type="hidden" name="month" value={month} />
            <label className="flex flex-col gap-2 text-sm font-medium">
              From
              <Input type="date" name="from" defaultValue={start} />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              To
              <Input type="date" name="to" defaultValue={end} />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Source
              <select
                name="source"
                defaultValue={sourceFilter}
                className="h-10 rounded-lg border border-input bg-white/75 px-3 text-sm shadow-sm shadow-sky-950/5 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35"
              >
                {Object.entries(sourceLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" className="sm:self-end">
              Apply
            </Button>
            <Link
              href={`/transactions?month=${month}${sourceFilter === "all" ? "" : `&source=${sourceFilter}`}`}
              className={buttonVariants({ variant: "outline", className: "sm:self-end" })}
            >
              Reset
            </Link>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Tag</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">In</TableHead>
                <TableHead className="text-right">Out</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Save to</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.map((t, index) => {
                const category = firstCategory(t.category);
                const previousCategory =
                  index > 0
                    ? firstCategory(sortedTransactions[index - 1].category)
                    : null;
                const categoryName = category?.name ?? "-";
                const tag = category?.tag ?? "uncategorized";
                const showGroup = tag !== (previousCategory?.tag ?? "");

                return [
                  showGroup ? (
                    <TableRow key={`${tag}-group`} className="bg-sky-50/60 hover:bg-sky-50/60">
                      <TableCell colSpan={9} className="py-2 text-xs font-semibold uppercase tracking-wide text-sky-900">
                        {tagLabels[tag] ?? tag}
                      </TableCell>
                    </TableRow>
                  ) : null,
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">{t.date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={tagBadgeClass(tag)}>
                        {tagLabels[tag] ?? tag}
                      </Badge>
                    </TableCell>
                    <TableCell>{categoryName}</TableCell>
                    <TableCell className="text-right text-emerald-700">
                      {t.direction === "in" ? <Money amountIdr={t.amount_idr} /> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right text-rose-600">
                      {t.direction === "out" ? <Money amountIdr={t.amount_idr} /> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.notes || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{t.save_to || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={sourceBadgeClass(t.source)}>
                        {sourceLabels[t.source] ?? t.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex items-center justify-end gap-1">
                      <TransactionDialog
                        categories={categoryList}
                        transaction={t}
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label="Edit transaction">
                            <Pencil className="size-4" />
                          </Button>
                        }
                      />
                      <DeleteTransactionButton id={t.id} />
                    </TableCell>
                  </TableRow>,
                ];
              })}
              {sortedTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No transactions in this date range.
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
