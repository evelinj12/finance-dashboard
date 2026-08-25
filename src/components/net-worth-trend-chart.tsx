"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useCurrency } from "@/components/currency-provider";
import { displayFromIdr, formatMoney } from "@/lib/currency";

export function NetWorthTrendChart({
  data,
}: {
  data: { month: string; netWorthIdr: number }[];
}) {
  const { currency, usdIdrRate } = useCurrency();

  const chartData = data.map((d) => ({
    month: new Date(d.month).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    value: displayFromIdr(d.netWorthIdr, currency, usdIdrRate),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData} margin={{ top: 12, right: 12, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 8" vertical={false} />
        <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis hide domain={["auto", "auto"]} />
        <Tooltip
          formatter={(value) => formatMoney(Number(value), currency)}
          labelStyle={{ color: "var(--foreground)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: 12,
            boxShadow: "0 18px 45px -28px rgb(15 47 85 / 0.45)",
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--chart-1)"
          strokeWidth={3}
          dot={{ r: 3, fill: "var(--chart-1)", stroke: "white", strokeWidth: 2 }}
          activeDot={{ r: 5, fill: "var(--chart-1)", stroke: "white", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
