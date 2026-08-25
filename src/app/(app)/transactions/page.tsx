import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/money";
import { MonthPicker } from "@/components/month-picker";
import { createClient } from "@/lib/supabase/server";
import { formatMonthLabel, monthRange, monthStart } from "@/lib/dates";
import { TransactionDialog } from "./transaction-dialog";
import { TransactionQuickForm } from "./transaction-quick-form";
import { DeleteTransactionButton } from "./delete-transaction-button";

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

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; from?: string; to?: string }>;
}) {
  const { month: monthParam, from: fromParam, to: toParam } = await searchParams;
  const month = monthParam ?? monthStart();
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

  const supabase = await createClient();
  const [{ data: categories }, { data: transactions }] = await Promise.all([
    supabase.from("categories").select("id, name, tag").eq("active", true).order("sort_order"),
    supabase
      .from("transactions")
      .select("id, date, category_id, direction, amount, currency, fx_rate, amount_idr, notes, save_to, category:categories(name)")
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: false }),
  ]);

  const categoryList = categories ?? [];

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
          <form className="grid gap-3 sm:grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_auto_auto]" action="/transactions">
            <input type="hidden" name="month" value={month} />
            <label className="flex flex-col gap-2 text-sm font-medium">
              From
              <Input type="date" name="from" defaultValue={start} />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              To
              <Input type="date" name="to" defaultValue={end} />
            </label>
            <Button type="submit" className="sm:self-end">
              Apply
            </Button>
            <Link href={`/transactions?month=${month}`} className={buttonVariants({ variant: "outline", className: "sm:self-end" })}>
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
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(transactions ?? []).map((t) => {
                const categoryName = Array.isArray(t.category) ? t.category[0]?.name : (t.category as { name: string } | null)?.name;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">{t.date}</TableCell>
                    <TableCell>{categoryName}</TableCell>
                    <TableCell className="text-right">
                      <Money
                        amountIdr={t.direction === "in" ? t.amount_idr : -t.amount_idr}
                        signed
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.notes}</TableCell>
                    <TableCell className="flex items-center justify-end gap-1">
                      <TransactionDialog
                        categories={categoryList}
                        transaction={t}
                        trigger={
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        }
                      />
                      <DeleteTransactionButton id={t.id} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!transactions || transactions.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
