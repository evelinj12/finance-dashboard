"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/money";
import { setNetWorthGoal } from "./actions";

interface Goal {
  year: number;
  target_amount: number;
}

export function GoalSection({ currentYear, goals }: { currentYear: number; goals: Goal[] }) {
  const goalsByYear = useMemo(() => new Map(goals.map((goal) => [goal.year, goal.target_amount])), [goals]);
  const [year, setYear] = useState(String(currentYear));
  const [target, setTarget] = useState(String(goalsByYear.get(currentYear) || ""));
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const numericYear = Number(year);

  function fillExistingGoal() {
    if (!Number.isInteger(numericYear)) return;
    const existingTarget = goalsByYear.get(numericYear);
    if (existingTarget !== undefined) {
      setTarget(String(existingTarget));
    }
  }

  function selectYear(goal: Goal) {
    setYear(String(goal.year));
    setTarget(String(goal.target_amount));
  }

  async function handleSave() {
    if (!Number.isInteger(numericYear) || numericYear < currentYear) {
      toast.error(`Choose ${currentYear} or a future year`);
      return;
    }

    setSaving(true);
    try {
      await setNetWorthGoal(numericYear, Number(target) || 0);
      toast.success("Goal saved");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save goal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-[9rem_minmax(14rem,1fr)_auto] sm:items-end">
        <div className="flex flex-col gap-2">
          <Label>Year</Label>
          <Input
            min={currentYear}
            type="number"
            value={year}
            onBlur={fillExistingGoal}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Net worth target (IDR)</Label>
          <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save goal"}
        </Button>
      </div>

      {goals.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {goals.map((goal) => (
            <button
              className="rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2 text-left text-sm transition-colors hover:border-sky-200 hover:bg-white"
              key={goal.year}
              onClick={() => selectYear(goal)}
              type="button"
            >
              <span className="block font-semibold">{goal.year}</span>
              <Money amountIdr={goal.target_amount} className="text-muted-foreground" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
