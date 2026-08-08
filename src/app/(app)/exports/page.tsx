import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const exports = [
  { dataset: "expenses", title: "Expenses", description: "Transactions ledger" },
  { dataset: "budgets", title: "Budgets", description: "Monthly category budgets" },
  { dataset: "income", title: "Income", description: "Income transactions" },
  { dataset: "income-sources", title: "Income Sources", description: "Client and product sources" },
  { dataset: "kevin-payouts", title: "Kevin Payouts", description: "Contractor payment tracking" },
  { dataset: "net-worth", title: "Net Worth", description: "Snapshot history" },
  { dataset: "goals", title: "Goals", description: "Annual targets" },
  { dataset: "monthly-summary", title: "Monthly Summary", description: "Finance summary view" },
];

export default function ExportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">Exports</h2>
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
                  <p className="truncate text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Button
                  nativeButton={false}
                  size="sm"
                  variant="outline"
                  render={
                    <a href={`/api/export/${item.dataset}`} download={`${item.dataset}.csv`}>
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
