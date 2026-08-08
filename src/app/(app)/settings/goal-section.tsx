"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setNetWorthGoal } from "./actions";

export function GoalSection({ year, currentTarget }: { year: number; currentTarget: number }) {
  const [target, setTarget] = useState(String(currentTarget || ""));
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSave() {
    setSaving(true);
    try {
      await setNetWorthGoal(year, Number(target) || 0);
      toast.success("Goal saved");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save goal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-2">
        <Label>{year} net worth target (IDR)</Label>
        <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} className="w-56" />
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save goal"}
      </Button>
    </div>
  );
}
