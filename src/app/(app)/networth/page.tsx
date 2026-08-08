import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/money";
import { NetWorthTrendChart } from "@/components/net-worth-trend-chart";
import { createClient } from "@/lib/supabase/server";
import { formatMonthLabel } from "@/lib/dates";
import { SnapshotDialog } from "./snapshot-dialog";
import { DeleteSnapshotButton } from "./delete-snapshot-button";

export default async function NetWorthPage() {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const [{ data: snapshots }, { data: goal }] = await Promise.all([
    supabase
      .from("net_worth_snapshots")
      .select(
        "id, month, cash, investments, retirement, personal, unsecured_liabilities, secured_liabilities, notes, total_assets, total_liabilities, net_worth"
      )
      .order("month", { ascending: true }),
    supabase.from("goals").select("target_amount").eq("type", "net_worth").eq("year", currentYear).maybeSingle(),
  ]);

  const latest = snapshots?.[snapshots.length - 1];
  const goalTarget = goal?.target_amount ?? 0;
  const goalProgressPct = goalTarget > 0 && latest ? Math.min(100, Math.max(0, (latest.net_worth / goalTarget) * 100)) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">Net Worth</h2>
        <SnapshotDialog
          trigger={
            <Button size="sm">
              <Plus className="size-4" /> Add snapshot
            </Button>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {snapshots && snapshots.length > 0 ? (
              <NetWorthTrendChart
                data={snapshots.map((s) => ({ month: s.month, netWorthIdr: s.net_worth }))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No snapshots yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{currentYear} goal</CardTitle>
          </CardHeader>
          <CardContent>
            {goalTarget > 0 && latest ? (
              <>
                <Progress value={goalProgressPct} className="mb-2" />
                <p className="text-sm text-muted-foreground">
                  <Money amountIdr={latest.net_worth} /> of <Money amountIdr={goalTarget} /> (
                  {goalProgressPct.toFixed(0)}%)
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Set a {currentYear} net worth goal in Settings.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {latest ? (
        <Card>
          <CardHeader>
            <CardTitle>Latest breakdown — {formatMonthLabel(latest.month)}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Cash</p>
              <Money amountIdr={latest.cash} className="font-medium" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Investments</p>
              <Money amountIdr={latest.investments} className="font-medium" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Retirement</p>
              <Money amountIdr={latest.retirement} className="font-medium" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Personal</p>
              <Money amountIdr={latest.personal} className="font-medium" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total assets</p>
              <Money amountIdr={latest.total_assets} className="font-medium" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total liabilities</p>
              <Money amountIdr={latest.total_liabilities} className="font-medium" />
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Net worth</p>
              <Money amountIdr={latest.net_worth} className="text-lg font-semibold" />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Assets</TableHead>
                <TableHead className="text-right">Liabilities</TableHead>
                <TableHead className="text-right">Net worth</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...(snapshots ?? [])].reverse().map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{formatMonthLabel(s.month)}</TableCell>
                  <TableCell className="text-right">
                    <Money amountIdr={s.total_assets} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money amountIdr={s.total_liabilities} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money amountIdr={s.net_worth} />
                  </TableCell>
                  <TableCell className="flex items-center justify-end gap-1">
                    <SnapshotDialog
                      snapshot={s}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      }
                    />
                    <DeleteSnapshotButton id={s.id} />
                  </TableCell>
                </TableRow>
              ))}
              {(!snapshots || snapshots.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No snapshots yet.
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
