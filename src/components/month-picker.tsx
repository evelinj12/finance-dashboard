"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { monthStart, shiftMonth } from "@/lib/dates";

const MONTHS = [
  { label: "January", value: "01" },
  { label: "February", value: "02" },
  { label: "March", value: "03" },
  { label: "April", value: "04" },
  { label: "May", value: "05" },
  { label: "June", value: "06" },
  { label: "July", value: "07" },
  { label: "August", value: "08" },
  { label: "September", value: "09" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];

export function MonthPicker({ month, resetParamsOnChange = [] }: { month: string; resetParamsOnChange?: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedYear = Number(month.slice(0, 4));
  const selectedMonth = month.slice(5, 7);
  const selectedMonthLabel = MONTHS.find((monthOption) => monthOption.value === selectedMonth)?.label ?? selectedMonth;
  const currentYear = Number(monthStart().slice(0, 4));
  const minYear = Math.min(selectedYear, currentYear) - 5;
  const maxYear = Math.max(selectedYear, currentYear) + 5;
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, index) => String(minYear + index));

  function goTo(newMonth: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", newMonth);
    resetParamsOnChange.forEach((param) => params.delete(param));
    router.push(`${pathname}?${params.toString()}`);
  }

  function setMonthPart(nextMonth: string | null) {
    if (!nextMonth) return;
    goTo(`${selectedYear}-${nextMonth}-01`);
  }

  function setYearPart(nextYear: string | null) {
    if (!nextYear) return;
    goTo(`${nextYear}-${selectedMonth}-01`);
  }

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-sky-100 bg-white/65 p-1 shadow-sm shadow-sky-950/5">
      <Button variant="ghost" size="icon-sm" onClick={() => goTo(shiftMonth(month, -1))} aria-label="Previous month">
        <ChevronLeft className="size-4" />
      </Button>
      <Select value={selectedMonth} onValueChange={setMonthPart}>
        <SelectTrigger size="sm" className="min-w-28 border-0 bg-transparent px-2 shadow-none" aria-label="Choose month">
          <SelectValue>{selectedMonthLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent align="center" className="min-w-32">
          {MONTHS.map((monthOption) => (
            <SelectItem key={monthOption.value} value={monthOption.value}>
              {monthOption.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(selectedYear)} onValueChange={setYearPart}>
        <SelectTrigger size="sm" className="min-w-24 border-0 bg-transparent px-2 shadow-none" aria-label="Choose year">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="center" className="min-w-24">
          {years.map((yearOption) => (
            <SelectItem key={yearOption} value={yearOption}>
              {yearOption}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="ghost" size="icon-sm" onClick={() => goTo(shiftMonth(month, 1))} aria-label="Next month">
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
