import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/money";
import { MonthPicker } from "@/components/month-picker";
import { createClient } from "@/lib/supabase/server";
import { monthRange, monthStart } from "@/lib/dates";
import { TransactionDialog } from "./transaction-dialog";
import { TransactionQuickForm } from "./transaction-quick-form";
import { DeleteTransactionButton } from "./delete-transaction-button";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? monthStart();
  const [start, end] = monthRange(month);

  const supabase = await createClient();
  const [{ data: categories }, { data: transactions }] = await Promise.all([
    supabase.from("categories").select("id, name, tag").eq("active", true).order("sort_order"),
    supabase
      .from("transactions")
      .select("id, date, category_id, direction, amount, currency, fx_rate, amount_idr, notes, save_to, category:categories(name)")
      .gte("date", start)
      .lt("date", end)
      .order("date", { ascending: false }),
  ]);

  const categoryList = categories ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">Transactions</h2>
        <div className="flex items-center gap-2">
          <MonthPicker month={month} />
        </div>
      </div>

      <TransactionQuickForm key={month} categories={categoryList} selectedMonth={month} />

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
                    No transactions this month yet.
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
