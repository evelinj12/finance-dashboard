import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/money";
import { MonthPicker } from "@/components/month-picker";
import { createClient } from "@/lib/supabase/server";
import { monthRange, monthStart } from "@/lib/dates";
import { AddSourceDialog } from "./add-source-dialog";
import { IncomeDialog } from "./income-dialog";
import { DeleteIncomeButton } from "./delete-income-button";

const typeLabels: Record<string, string> = {
  freelance_client: "Freelance client",
  digital_product: "Digital product",
  other: "Other",
};

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? monthStart();
  const [start, end] = monthRange(month);

  const supabase = await createClient();
  const [{ data: sources }, { data: incomeTx }] = await Promise.all([
    supabase.from("income_sources").select("id, name, type").eq("active", true).order("name"),
    supabase
      .from("income_transactions")
      .select(
        "id, income_source_id, date, description, amount, currency, fx_rate, amount_idr, status, income_source:income_sources(name, type)"
      )
      .gte("date", start)
      .lt("date", end)
      .order("date", { ascending: false }),
  ]);

  const sourceList = sources ?? [];

  const totalsByType: Record<string, number> = { freelance_client: 0, digital_product: 0, other: 0 };
  for (const t of incomeTx ?? []) {
    const source = t.income_source as unknown as { type: string } | { type: string }[] | null;
    const type = Array.isArray(source) ? source[0]?.type : source?.type;
    if (type) totalsByType[type] = (totalsByType[type] ?? 0) + t.amount_idr;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">Income</h2>
        <div className="flex items-center gap-2">
          <MonthPicker month={month} />
          <AddSourceDialog />
          <IncomeDialog
            sources={sourceList}
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Add
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {Object.entries(typeLabels).map(([type, label]) => (
          <Card key={type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <Money amountIdr={totalsByType[type] ?? 0} className="text-xl font-semibold" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(incomeTx ?? []).map((t) => {
                const source = t.income_source as unknown as { name: string } | { name: string }[] | null;
                const sourceName = Array.isArray(source) ? source[0]?.name : source?.name;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">{t.date}</TableCell>
                    <TableCell>{sourceName}</TableCell>
                    <TableCell className="text-muted-foreground">{t.description}</TableCell>
                    <TableCell className="text-right">
                      <Money amountIdr={t.amount_idr} />
                    </TableCell>
                    <TableCell className="flex items-center justify-end gap-1">
                      <IncomeDialog
                        sources={sourceList}
                        income={t}
                        trigger={
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        }
                      />
                      <DeleteIncomeButton id={t.id} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!incomeTx || incomeTx.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No income logged this month yet.
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
