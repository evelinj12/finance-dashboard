"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatMonthLabel, shiftMonth } from "@/lib/dates";

export function MonthPicker({ month }: { month: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goTo(newMonth: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", newMonth);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" onClick={() => goTo(shiftMonth(month, -1))}>
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-36 text-center text-sm font-medium">{formatMonthLabel(month)}</span>
      <Button variant="ghost" size="icon" onClick={() => goTo(shiftMonth(month, 1))}>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
