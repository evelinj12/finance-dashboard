"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
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
import { setBudgets } from "./actions";

interface CategoryRow {
  id: string;
  name: string;
  tag: string;
  budget: number;
}

const tagLabels: Record<string, string> = {
  income: "Income",
  sinking_fund: "Sinking Funds",
  fixed: "Fixed Expenses",
  spent: "Variable Spending",
};

export function EditBudgetsDialog({
  month,
  categories,
}: {
  month: string;
  categories: CategoryRow[];
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(categories.map((c) => [c.id, String(c.budget)]))
  );
  const router = useRouter();

  const grouped = categories.reduce<Record<string, CategoryRow[]>>((acc, c) => {
    (acc[c.tag] ??= []).push(c);
    return acc;
  }, {});

  async function handleSave() {
    setSaving(true);
    try {
      await setBudgets(
        month,
        categories.map((c) => ({
          category_id: c.id,
          budget_amount: Number(values[c.id]) || 0,
        }))
      );
      toast.success("Budgets updated");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update budgets");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" aria-label="Edit budgets">
            <Pencil className="size-4" />
            Budgets
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit budgets for this month</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {Object.entries(grouped).map(([tag, rows]) => (
            <div key={tag} className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">{tagLabels[tag] ?? tag}</p>
              {rows.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <Label className="flex-1 text-sm font-normal">{c.name}</Label>
                  <Input
                    type="number"
                    className="w-32"
                    value={values[c.id]}
                    onChange={(e) => setValues((v) => ({ ...v, [c.id]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save budgets"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
