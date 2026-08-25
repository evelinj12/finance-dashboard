"use client";

import { CalendarDays, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMonthLabel } from "@/lib/dates";

const rangeLabels: Record<string, string> = {
  "6m": "Last 6 months",
  "12m": "Last 12 months",
  ytd: "Year to date",
  all: "All time",
};

function useDashboardParamUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  };
}

export function DashboardMonthSelect({ month, months }: { month: string; months: string[] }) {
  const updateParam = useDashboardParamUpdater();
  const monthOptions = [month, ...months].filter((value, index, values) => values.indexOf(value) === index);
  const monthItems = monthOptions.map((option) => ({
    value: option,
    label: formatMonthLabel(option),
  }));

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800 shadow-sm shadow-emerald-900/5">
      <CalendarDays className="size-4" aria-hidden="true" />
      <Select items={monthItems} value={month} onValueChange={(value) => value && updateParam("month", value)}>
        <SelectTrigger className="h-8 w-40 border-0 bg-transparent px-1 py-0 text-emerald-800 shadow-none focus-visible:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {monthOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {formatMonthLabel(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function NetWorthRangeSelect({ value }: { value: string }) {
  const updateParam = useDashboardParamUpdater();
  const rangeItems = Object.entries(rangeLabels).map(([rangeValue, label]) => ({ value: rangeValue, label }));

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/75 px-2 py-1 shadow-sm shadow-sky-950/5">
      <SlidersHorizontal className="size-4 text-sky-700" aria-hidden="true" />
      <Select
        items={rangeItems}
        value={rangeLabels[value] ? value : "12m"}
        onValueChange={(nextValue) => nextValue && updateParam("netWorthRange", nextValue)}
      >
        <SelectTrigger className="h-8 w-36 border-0 bg-transparent px-1 py-0 shadow-none focus-visible:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(rangeLabels).map(([rangeValue, label]) => (
            <SelectItem key={rangeValue} value={rangeValue}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
