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
import {
  TransactionChecklist,
  type ChecklistSort,
  type ChecklistStatusFilter,
} from "./transaction-checklist";
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
const tagValues = new Set<string>(["all", "sinking_fund", "fixed", "spent", "income"]);
const txSortValues = new Set<string>(["tag", "date_desc", "date_asc", "amount_desc", "amount_asc", "category"]);
const checklistStatusValues = new Set<ChecklistStatusFilter>(["all", "open", "done"]);
const checklistSortValues = new Set<ChecklistSort>(["custom", "title", "latest", "status"]);

type TxSort = "tag" | "date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "category";

function isSourceFilter(value: string | undefined): value is SourceFilter {
  return Boolean(value && sourceValues.has(value as SourceFilter));
}

function normalizeTagFilter(value: string | undefined) {
  return value && tagValues.has(value) ? value : "all";
}

function normalizeTxSort(value: string | undefined): TxSort {
  return value && txSortValues.has(value) ? (value as TxSort) : "tag";
}

function normalizeChecklistStatus(value: string | undefined): ChecklistStatusFilter {
  return value && checklistStatusValues.has(value as ChecklistStatusFilter)
    ? (value as ChecklistStatusFilter)
    : "all";
}

function normalizeChecklistSort(value: string | undefined): ChecklistSort {
  return value && checklistSortValues.has(value as ChecklistSort) ? (value as ChecklistSort) : "custom";
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
  searchParams: Promise<{
    month?: string;
    from?: string;
    to?: string;
    source?: string;
    tag?: string;
    category?: string;
    txSort?: string;
    checklistStatus?: string;
    checklistSort?: string;
  }>;
}) {
  const {
    month: monthParam,
    from: fromParam,
    to: toParam,
    source: sourceParam,
    tag: tagParam,
    category: categoryParam,
    txSort: txSortParam,
    checklistStatus: checklistStatusParam,
    checklistSort: checklistSortParam,
  } = await searchParams;
  const month = monthParam ?? monthStart();
  const sourceFilter: SourceFilter = isSourceFilter(sourceParam) ? sourceParam : "all";
  const tagFilter = normalizeTagFilter(tagParam);
  const categoryFilter = categoryParam?.trim() || "all";
  const txSort = normalizeTxSort(txSortParam);
  const checklistStatus = normalizeChecklistStatus(checklistStatusParam);
  const checklistSort = normalizeChecklistSort(checklistSortParam);
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
      "id, date, category_id, direction, amount, currency, fx_rate, amount_idr, notes, save_to, source, recurring_type, recurring_template_id, generated_month, created_at, category:categories(name, tag, sort_order)"
    )
    .gte("date", start)
    .lte("date", end);

  if (sourceFilter !== "all") {
    transactionQuery.eq("source", sourceFilter);
  }

  const [{ data: categories }, { data: transactions }, { data: checklistItems }] = await Promise.all([
    supabase.from("categories").select("id, name, tag").eq("active", true).order("sort_order"),
    transactionQuery,
    supabase
      .from("transaction_checklist_items")
      .select("id, month, title, latest_date_note, completed, sort_order")
      .eq("month", month),
  ]);

  const categoryList = categories ?? [];
  const filteredTransactions = [...(transactions ?? [])].filter((transaction) => {
    const category = firstCategory(transaction.category);
    const tag = category?.tag ?? "uncategorized";
    if (tagFilter !== "all" && tag !== tagFilter) return false;
    if (categoryFilter !== "all" && transaction.category_id !== categoryFilter) return false;
    return true;
  });

  const sortedTransactions = filteredTransactions.sort((a, b) => {
    const aCategory = firstCategory(a.category);
    const bCategory = firstCategory(b.category);
    const aCategoryName = aCategory?.name ?? "";
    const bCategoryName = bCategory?.name ?? "";

    if (txSort === "date_desc") return b.date.localeCompare(a.date);
    if (txSort === "date_asc") return a.date.localeCompare(b.date);
    if (txSort === "amount_desc") return Number(b.amount_idr) - Number(a.amount_idr);
    if (txSort === "amount_asc") return Number(a.amount_idr) - Number(b.amount_idr);
    if (txSort === "category") {
      const categoryDiff = aCategoryName.localeCompare(bCategoryName);
      if (categoryDiff !== 0) return categoryDiff;
      return b.date.localeCompare(a.date);
    }

    const aTag = aCategory?.tag ?? "";
    const bTag = bCategory?.tag ?? "";
    const tagDiff = (tagOrder[aTag] ?? 99) - (tagOrder[bTag] ?? 99);
    if (tagDiff !== 0) return tagDiff;

    const submittedDiff = (b.created_at ?? "").localeCompare(a.created_at ?? "");
    if (submittedDiff !== 0) return submittedDiff;

    const dateDiff = b.date.localeCompare(a.date);
    if (dateDiff !== 0) return dateDiff;

    return (a.notes ?? "").localeCompare(b.notes ?? "");
  });
  const checklistItemsList = [...(checklistItems ?? [])]
    .filter((item) => {
      if (checklistStatus === "open") return !item.completed;
      if (checklistStatus === "done") return item.completed;
      return true;
    })
    .sort((a, b) => {
      if (checklistSort === "title") return a.title.localeCompare(b.title);
      if (checklistSort === "latest") return (a.latest_date_note ?? "").localeCompare(b.latest_date_note ?? "");
      if (checklistSort === "status") return Number(a.completed) - Number(b.completed);
      return a.sort_order - b.sort_order || a.title.localeCompare(b.title);
    });
  const resetTransactionFiltersUrl = `/transactions?month=${month}${
    checklistStatus === "all" ? "" : `&checklistStatus=${checklistStatus}`
  }${checklistSort === "custom" ? "" : `&checklistSort=${checklistSort}`}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">Transactions</h2>
        <div className="flex items-center gap-2">
          <MonthPicker month={month} resetParamsOnChange={["from", "to"]} />
        </div>
      </div>

      <TransactionQuickForm key={month} categories={categoryList} selectedMonth={month} />

      <TransactionChecklist
        month={month}
        items={checklistItemsList}
        statusFilter={checklistStatus}
        sort={checklistSort}
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-base font-semibold">Date range</h3>
            <p className="text-sm text-muted-foreground">{dateRangeLabel}</p>
          </div>
          <form className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-[minmax(140px,0.9fr)_minmax(140px,0.9fr)_minmax(140px,0.9fr)_minmax(140px,0.9fr)_minmax(160px,1fr)_minmax(150px,1fr)_auto_auto]" action="/transactions">
            <input type="hidden" name="month" value={month} />
            {checklistStatus === "all" ? null : (
              <input type="hidden" name="checklistStatus" value={checklistStatus} />
            )}
            {checklistSort === "custom" ? null : <input type="hidden" name="checklistSort" value={checklistSort} />}
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
            <label className="flex flex-col gap-2 text-sm font-medium">
              Tag
              <select
                name="tag"
                defaultValue={tagFilter}
                className="h-10 rounded-lg border border-input bg-white/75 px-3 text-sm shadow-sm shadow-sky-950/5 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35"
              >
                <option value="all">All tags</option>
                {Object.entries(tagLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Category
              <select
                name="category"
                defaultValue={categoryFilter}
                className="h-10 rounded-lg border border-input bg-white/75 px-3 text-sm shadow-sm shadow-sky-950/5 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35"
              >
                <option value="all">All categories</option>
                {categoryList.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Sort
              <select
                name="txSort"
                defaultValue={txSort}
                className="h-10 rounded-lg border border-input bg-white/75 px-3 text-sm shadow-sm shadow-sky-950/5 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35"
              >
                <option value="tag">Tag group, newest submissions</option>
                <option value="date_desc">Newest first</option>
                <option value="date_asc">Oldest first</option>
                <option value="amount_desc">Amount high-low</option>
                <option value="amount_asc">Amount low-high</option>
                <option value="category">Category A-Z</option>
              </select>
            </label>
            <Button type="submit" className="w-full sm:self-end">
              Apply
            </Button>
            <Link
              href={resetTransactionFiltersUrl}
              className={buttonVariants({ variant: "outline", className: "w-full sm:self-end" })}
            >
              Reset
            </Link>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 md:hidden">
        {sortedTransactions.map((t, index) => {
          const category = firstCategory(t.category);
          const previousCategory = index > 0 ? firstCategory(sortedTransactions[index - 1].category) : null;
          const categoryName = category?.name ?? "-";
          const tag = category?.tag ?? "uncategorized";
          const showGroup = txSort === "tag" && tag !== (previousCategory?.tag ?? "");
          const signedTone = t.direction === "in" ? "text-emerald-700" : "text-rose-600";

          return (
            <div key={t.id} className="flex flex-col gap-2">
              {showGroup ? (
                <div className="px-1 text-xs font-semibold uppercase tracking-wide text-sky-900">
                  {tagLabels[tag] ?? tag}
                </div>
              ) : null}
              <Card>
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{categoryName}</p>
                      <p className="text-xs text-muted-foreground">{t.date}</p>
                    </div>
                    <div className={`shrink-0 text-right text-base font-bold money-figures ${signedTone}`}>
                      {t.direction === "out" ? "-" : ""}
                      <Money amountIdr={t.amount_idr} />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={tagBadgeClass(tag)}>
                      {tagLabels[tag] ?? tag}
                    </Badge>
                    <Badge variant="outline" className={sourceBadgeClass(t.source)}>
                      {sourceLabels[t.source] ?? t.source}
                    </Badge>
                  </div>

                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground">Notes: </span>
                      {t.notes || "-"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Save to: </span>
                      {t.save_to || "-"}
                    </div>
                  </div>

                  <div className="flex justify-end gap-1 border-t border-sky-100 pt-2">
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
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
        {sortedTransactions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No transactions in this date range.
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card className="hidden md:flex">
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
                const showGroup = txSort === "tag" && tag !== (previousCategory?.tag ?? "");

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
