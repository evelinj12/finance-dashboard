import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthPicker } from "@/components/month-picker";
import { monthStart } from "@/lib/dates";

const exports = [
  { dataset: "expenses", title: "Expenses", description: "Transactions ledger", monthFilter: true },
  { dataset: "budgets", title: "Budgets", description: "Monthly category budgets", monthFilter: true },
  { dataset: "income", title: "Income", description: "Income transactions", monthFilter: true },
  { dataset: "team-work", title: "Team Work", description: "Team payout entries", monthFilter: true },
  { dataset: "family-records", title: "Family Records", description: "Record-only family support ledger", monthFilter: true },
  { dataset: "family-transfers", title: "Family Transfers", description: "Family transfer status history", monthFilter: true },
  { dataset: "net-worth", title: "Net Worth", description: "Snapshot history", monthFilter: true },
  { dataset: "monthly-summary", title: "Monthly Summary", description: "Finance summary view", monthFilter: true },
  { dataset: "income-sources", title: "Income Sources", description: "Client and product sources", monthFilter: false },
  { dataset: "team-members", title: "Team Members", description: "People helping with client work", monthFilter: false },
  { dataset: "goals", title: "Goals", description: "Annual targets", monthFilter: false },
];

export default async function ExportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam ?? monthStart();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">Exports</h2>
        <MonthPicker month={month} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CSV Downloads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {exports.map((item) => (
              <div
                key={item.dataset}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="font-medium leading-tight">{item.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {item.description}
                    {item.monthFilter ? " · filtered by selected month" : " · all-time"}
                  </p>
                </div>
                <Button
                  nativeButton={false}
                  size="sm"
                  variant="outline"
                  render={
                    <a
                      href={`/api/export/${item.dataset}${
                        item.monthFilter ? `?month=${encodeURIComponent(month)}` : ""
                      }`}
                      download={`${item.dataset}${item.monthFilter ? `-${month.slice(0, 7)}` : ""}.csv`}
                    >
                      <Download className="size-3.5" />
                      CSV
                    </a>
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
