import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/money";
import { createClient } from "@/lib/supabase/server";
import { PaymentDialog } from "./payment-dialog";
import { DeletePaymentButton } from "./delete-payment-button";

export default async function BrotherPage() {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const [{ data: payments }, { data: recentIncome }] = await Promise.all([
    supabase
      .from("contractor_payments")
      .select("id, date, amount_idr, notes, related_income_transaction_id")
      .order("date", { ascending: false }),
    supabase
      .from("income_transactions")
      .select("id, date, description, amount_idr")
      .order("date", { ascending: false })
      .limit(30),
  ]);

  const allTimeTotal = (payments ?? []).reduce((s, p) => s + p.amount_idr, 0);
  const thisYearTotal = (payments ?? [])
    .filter((p) => p.date.startsWith(String(currentYear)))
    .reduce((s, p) => s + p.amount_idr, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">Brother Payments</h2>
        <PaymentDialog recentIncome={recentIncome ?? []} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This year ({currentYear})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={thisYearTotal} className="text-xl font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">All time</CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={allTimeTotal} className="text-xl font-semibold" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(payments ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-nowrap">{p.date}</TableCell>
                  <TableCell className="text-right">
                    <Money amountIdr={p.amount_idr} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.notes}</TableCell>
                  <TableCell>
                    <DeletePaymentButton id={p.id} />
                  </TableCell>
                </TableRow>
              ))}
              {(!payments || payments.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No payments logged yet.
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
