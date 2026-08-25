"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatMonthLabel, shiftMonth } from "@/lib/dates";

export function MonthPicker({ month, resetParamsOnChange = [] }: { month: string; resetParamsOnChange?: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goTo(newMonth: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", newMonth);
    resetParamsOnChange.forEach((param) => params.delete(param));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-sky-100 bg-white/65 p-1 shadow-sm shadow-sky-950/5">
      <Button variant="ghost" size="icon-sm" onClick={() => goTo(shiftMonth(month, -1))} aria-label="Previous month">
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-36 text-center text-sm font-semibold">{formatMonthLabel(month)}</span>
      <Button variant="ghost" size="icon-sm" onClick={() => goTo(shiftMonth(month, 1))} aria-label="Next month">
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
