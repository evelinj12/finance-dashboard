import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/money";
import { createClient } from "@/lib/supabase/server";
import { PaymentDialog } from "./payment-dialog";
import { DeletePaymentButton } from "./delete-payment-button";

const statusLabels = {
  owed: "Owed",
  paid: "Paid",
  transferred: "Transferred",
  unknown: "Unknown",
};

export default async function BrotherPage() {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const [{ data: payments }, { data: recentIncome }] = await Promise.all([
    supabase
      .from("contractor_payments")
      .select(
        "id, date, amount_idr, client_or_project, work_period, hours, status, paid_at, notes, related_income_transaction_id"
      )
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
  const owedTotal = (payments ?? []).filter((p) => p.status === "owed").reduce((s, p) => s + p.amount_idr, 0);
  const paidTotal = (payments ?? [])
    .filter((p) => p.status === "paid" || p.status === "transferred")
    .reduce((s, p) => s + p.amount_idr, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">Brother Payments</h2>
        <PaymentDialog recentIncome={recentIncome ?? []} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Owed</CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={owedTotal} className="text-xl font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid / transferred</CardTitle>
          </CardHeader>
          <CardContent>
            <Money amountIdr={paidTotal} className="text-xl font-semibold" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Work period</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Paid at</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(payments ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-nowrap">{p.date}</TableCell>
                  <TableCell>{p.client_or_project ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.work_period ?? "-"}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.hours ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "owed" ? "destructive" : "secondary"}>
                      {statusLabels[p.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Money amountIdr={p.amount_idr} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{p.paid_at ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.notes}</TableCell>
                  <TableCell>
                    <DeletePaymentButton id={p.id} />
                  </TableCell>
                </TableRow>
              ))}
              {(!payments || payments.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
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
