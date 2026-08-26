import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoalProgressDonut } from "@/components/goal-progress-donut";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/money";
import { NetWorthTrendChart } from "@/components/net-worth-trend-chart";
import { createClient } from "@/lib/supabase/server";
import { formatMonthLabel } from "@/lib/dates";
import { SnapshotDialog } from "./snapshot-dialog";
import { DeleteSnapshotButton } from "./delete-snapshot-button";
import { NetWorthCategoriesSection } from "./net-worth-categories-section";

interface Snapshot {
  id: string;
  month: string;
  cash: number;
  investments: number;
  retirement: number;
  personal: number;
  unsecured_liabilities: number;
  secured_liabilities: number;
  notes: string | null;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
}

interface NetWorthCategory {
  id: string;
  name: string;
  group_name: "asset" | "liability";
  active: boolean;
  source_key: string | null;
}

interface NetWorthCategoryValue {
  snapshot_id: string;
  category_id: string;
  amount_idr: number;
  notes: string | null;
}

function legacySnapshotAmount(snapshot: Snapshot | undefined, sourceKey: string | null) {
  if (!snapshot) return 0;
  switch (sourceKey) {
    case "cash":
      return snapshot.cash;
    case "investments":
      return snapshot.investments;
    case "retirement":
      return snapshot.retirement;
    case "personal":
      return snapshot.personal;
    case "unsecured_liabilities":
      return snapshot.unsecured_liabilities;
    case "secured_liabilities":
      return snapshot.secured_liabilities;
    default:
      return 0;
  }
}

export default async function NetWorthPage() {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const [{ data: snapshots }, { data: goal }, { data: categories }, { data: categoryValues }] = await Promise.all([
    supabase
      .from("net_worth_snapshots")
      .select(
        "id, month, cash, investments, retirement, personal, unsecured_liabilities, secured_liabilities, notes, total_assets, total_liabilities, net_worth"
      )
      .order("month", { ascending: true }),
    supabase.from("goals").select("target_amount").eq("type", "net_worth").eq("year", currentYear).maybeSingle(),
    supabase
      .from("net_worth_categories")
      .select("id, name, group_name, active, source_key")
      .order("sort_order", { ascending: true }),
    supabase.from("net_worth_category_values").select("snapshot_id, category_id, amount_idr, notes"),
  ]);

  const snapshotRows = (snapshots ?? []) as Snapshot[];
  const categoryRows = (categories ?? []) as NetWorthCategory[];
  const valueRows = (categoryValues ?? []) as NetWorthCategoryValue[];
  const latest = snapshotRows[snapshotRows.length - 1];
  const goalTarget = goal?.target_amount ?? 0;
  const goalProgressPct = goalTarget > 0 && latest ? Math.min(100, Math.max(0, (latest.net_worth / goalTarget) * 100)) : 0;
  const valuesBySnapshot = new Map<string, NetWorthCategoryValue[]>();
  for (const value of valueRows) {
    valuesBySnapshot.set(value.snapshot_id, [...(valuesBySnapshot.get(value.snapshot_id) ?? []), value]);
  }
  const latestValues = new Map((latest ? valuesBySnapshot.get(latest.id) ?? [] : []).map((value) => [value.category_id, value]));
  const latestCategories = categoryRows.filter((category) => category.active || latestValues.has(category.id));
  const yearlyLatest = [...snapshotRows].reduce<Record<string, Snapshot>>((byYear, snapshot) => {
    byYear[snapshot.month.slice(0, 4)] = snapshot;
    return byYear;
  }, {});
  const yearlySummaries = Object.entries(yearlyLatest).sort(([yearA], [yearB]) => Number(yearA) - Number(yearB));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">Net Worth</h2>
        <SnapshotDialog
          categories={categoryRows}
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
            {snapshotRows.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {yearlySummaries.map(([year, snapshot]) => (
                    <div key={year} className="rounded-md border px-3 py-2">
                      <p className="text-xs text-muted-foreground">{year}</p>
                      <Money amountIdr={snapshot.net_worth} className="font-medium" />
                    </div>
                  ))}
                </div>
                <NetWorthTrendChart
                  data={snapshotRows.map((s) => ({ month: s.month, netWorthIdr: s.net_worth }))}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No snapshots yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-b from-white to-sky-50/70">
          <CardHeader>
            <CardTitle>{currentYear} goal</CardTitle>
          </CardHeader>
          <CardContent>
            {goalTarget > 0 && latest ? (
              <GoalProgressDonut
                year={currentYear}
                currentAmountIdr={latest.net_worth}
                targetAmountIdr={goalTarget}
                progressPct={goalProgressPct}
              />
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
            <CardTitle>Latest breakdown - {formatMonthLabel(latest.month)}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              {(["asset", "liability"] as const).map((group) => {
                const groupCategories = latestCategories.filter((category) => category.group_name === group);
                if (groupCategories.length === 0) return null;

                return (
                  <div key={group} className="flex flex-col gap-2">
                    <p className="text-sm font-medium capitalize">{group}s</p>
                    <div className="flex flex-col divide-y rounded-md border">
                      {groupCategories.map((category) => {
                        const amount =
                          latestValues.get(category.id)?.amount_idr ??
                          legacySnapshotAmount(latest, category.source_key);

                        return (
                          <div key={category.id} className="flex items-center justify-between gap-3 px-3 py-2">
                            <span className="text-sm">{category.name}</span>
                            <Money amountIdr={amount} className="text-sm font-medium" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Total assets</p>
                <Money amountIdr={latest.total_assets} className="font-medium" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total liabilities</p>
                <Money amountIdr={latest.total_liabilities} className="font-medium" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net worth</p>
                <Money amountIdr={latest.net_worth} className="text-lg font-semibold" />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Net worth categories</CardTitle>
        </CardHeader>
        <CardContent>
          <NetWorthCategoriesSection categories={categoryRows} />
        </CardContent>
      </Card>

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
              {[...snapshotRows].reverse().map((s) => (
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
                      categories={categoryRows}
                      categoryValues={valuesBySnapshot.get(s.id) ?? []}
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${formatMonthLabel(s.month)} snapshot`}>
                          <Pencil className="size-4" />
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
