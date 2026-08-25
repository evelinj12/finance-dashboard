"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { monthStart } from "@/lib/dates";
import type { NetWorthCategoryGroup } from "@/lib/supabase/types";
import { upsertSnapshot } from "./actions";

interface ExistingSnapshot {
  month: string;
  cash: number;
  investments: number;
  retirement: number;
  personal: number;
  unsecured_liabilities: number;
  secured_liabilities: number;
  notes: string | null;
}

interface NetWorthCategory {
  id: string;
  name: string;
  group_name: NetWorthCategoryGroup;
  active: boolean;
  source_key: string | null;
}

interface NetWorthCategoryValue {
  category_id: string;
  amount_idr: number;
  notes: string | null;
}

function legacySnapshotAmount(snapshot: ExistingSnapshot | undefined, sourceKey: string | null) {
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

export function SnapshotDialog({
  snapshot,
  categories,
  categoryValues = [],
  trigger,
}: {
  snapshot?: ExistingSnapshot;
  categories: NetWorthCategory[];
  categoryValues?: NetWorthCategoryValue[];
  trigger: React.ReactElement;
}) {
  const isEdit = !!snapshot;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState(snapshot?.month ?? monthStart());
  const valuesByCategory = new Map(categoryValues.map((value) => [value.category_id, value]));
  const visibleCategories = categories.filter((category) => {
    return category.active || valuesByCategory.has(category.id);
  });
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      visibleCategories.map((category) => [
        category.id,
        String(valuesByCategory.get(category.id)?.amount_idr ?? legacySnapshotAmount(snapshot, category.source_key)),
      ]),
    ),
  );
  const [notes, setNotes] = useState(snapshot?.notes ?? "");
  const router = useRouter();

  async function handleSave() {
    setSaving(true);
    try {
      await upsertSnapshot({
        month,
        values: visibleCategories.map((category) => ({
          category_id: category.id,
          amount_idr: Number(values[category.id]) || 0,
          notes: null,
        })),
        notes: notes || null,
      });
      toast.success("Snapshot saved");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save snapshot");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit snapshot" : "Add monthly snapshot"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Month</Label>
            <Input
              type="month"
              value={month.slice(0, 7)}
              onChange={(e) => setMonth(`${e.target.value}-01`)}
              disabled={isEdit}
            />
          </div>
          {visibleCategories.length > 0 ? (
            <>
              {(["asset", "liability"] as const).map((group) => {
                const groupCategories = visibleCategories.filter((category) => category.group_name === group);
                if (groupCategories.length === 0) return null;

                return (
                  <div key={group} className="flex flex-col gap-3 rounded-md border p-3">
                    <div className="text-sm font-medium capitalize">{group}s</div>
                    {groupCategories.map((category) => (
                      <div key={category.id} className="flex flex-col gap-2">
                        <Label>{category.name} (IDR)</Label>
                        <Input
                          type="number"
                          value={values[category.id] ?? "0"}
                          onChange={(e) =>
                            setValues((currentValues) => ({
                              ...currentValues,
                              [category.id]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          ) : (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              Add net worth categories before saving a categorized snapshot.
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save snapshot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
