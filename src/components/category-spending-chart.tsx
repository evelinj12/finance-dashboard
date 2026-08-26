"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Money } from "@/components/money";
import { useCurrency } from "@/components/currency-provider";
import { displayFromIdr, formatMoney } from "@/lib/currency";

export type CategorySpendingDatum = {
  name: string;
  amountIdr: number;
};

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "oklch(0.73 0.16 196)",
  "oklch(0.77 0.14 332)",
  "oklch(0.78 0.13 118)",
  "oklch(0.69 0.13 20)",
  "oklch(0.68 0.11 280)",
];

function percentLabel(value: number) {
  if (value > 0 && value < 1) return "<1%";
  return `${Math.round(value)}%`;
}

function SpendingTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: CategorySpendingDatum & { percent: number } }>;
}) {
  const { currency, usdIdrRate } = useCurrency();
  const row = payload?.[0]?.payload;

  if (!active || !row) return null;

  return (
    <div className="rounded-lg border border-sky-100 bg-white px-3 py-2 text-xs shadow-lg shadow-sky-950/15">
      <p className="font-semibold text-foreground">{row.name}</p>
      <p className="mt-1 text-muted-foreground">
        {formatMoney(displayFromIdr(row.amountIdr, currency, usdIdrRate), currency)} · {percentLabel(row.percent)}
      </p>
    </div>
  );
}

export function CategorySpendingChart({ data }: { data: CategorySpendingDatum[] }) {
  const total = data.reduce((sum, row) => sum + row.amountIdr, 0);
  const chartData = data
    .filter((row) => row.amountIdr > 0)
    .map((row) => ({
      ...row,
      percent: total > 0 ? (row.amountIdr / total) * 100 : 0,
    }));

  if (chartData.length === 0) {
    return (
      <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-sky-200 bg-sky-50/50 p-6 text-center">
        <div>
          <p className="font-semibold text-foreground">No category spending yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Outgoing fixed and spent transactions will appear here.</p>
        </div>
      </div>
    );
  }

  const leftRows = chartData.filter((_, index) => index % 2 === 0);
  const rightRows = chartData.filter((_, index) => index % 2 === 1);

  return (
    <div className="grid min-h-80 gap-4 lg:grid-cols-[minmax(160px,0.85fr)_minmax(240px,1fr)_minmax(160px,0.85fr)] lg:items-center">
      <CategoryLabelList rows={leftRows} align="left" />
      <div className="relative h-72 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              dataKey="amountIdr"
              innerRadius="38%"
              outerRadius="74%"
              paddingAngle={1.5}
              stroke="white"
              strokeWidth={3}
            >
              {chartData.map((entry, index) => (
                <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip content={<SpendingTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="rounded-full bg-white/90 px-5 py-4 text-center shadow-sm shadow-sky-950/10">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Total</p>
            <Money amountIdr={total} className="mt-1 block text-lg font-bold money-figures" />
          </div>
        </div>
      </div>
      <CategoryLabelList rows={rightRows} align="right" />
    </div>
  );
}

function CategoryLabelList({
  rows,
  align,
}: {
  rows: Array<CategorySpendingDatum & { percent: number }>;
  align: "left" | "right";
}) {
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, index) => (
        <div
          key={row.name}
          className={`flex items-center gap-3 rounded-lg border border-sky-100 bg-white/65 px-3 py-2 shadow-sm shadow-sky-950/5 ${
            align === "right" ? "lg:flex-row-reverse lg:text-right" : ""
          }`}
        >
          <span
            aria-hidden="true"
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: chartColors[(index * 2 + (align === "right" ? 1 : 0)) % chartColors.length] }}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">{row.name}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {percentLabel(row.percent)} · <Money amountIdr={row.amountIdr} />
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
