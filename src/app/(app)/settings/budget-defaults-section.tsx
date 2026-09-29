"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CategoryTag } from "@/lib/supabase/types";
import { deleteBudgetDefault, setBudgetDefaults } from "../budget/actions";

interface BudgetDefaultCategory {
  id: string;
  name: string;
  tag: CategoryTag;
  budget: number;
  hasDefault: boolean;
}

const tagLabels: Record<CategoryTag, string> = {
  income: "Income",
  sinking_fund: "Sinking Funds",
  fixed: "Fixed Expenses",
  spent: "Variable Spending",
};

const tagOrder: CategoryTag[] = ["income", "sinking_fund", "fixed", "spent"];

export function BudgetDefaultsSection({ categories }: { categories: BudgetDefaultCategory[] }) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(categories.map((category) => [category.id, String(category.budget)]))
  );
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(categories.map((category) => [category.id, category.hasDefault]))
  );
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const grouped = tagOrder.map((tag) => ({
    tag,
    rows: categories.filter((category) => category.tag === tag),
  }));

  async function handleSave() {
    setSaving(true);
    try {
      await setBudgetDefaults(
        categories
          .filter((category) => enabled[category.id])
          .map((category) => ({
            category_id: category.id,
            budget_amount: Number(values[category.id]) || 0,
          }))
      );
      toast.success("Default budgets updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update default budgets");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category: BudgetDefaultCategory) {
    if (
      !confirm(
        `Delete the default budget for ${category.name}? This also clears this category's current-month budget amount.`
      )
    ) {
      return;
    }

    setDeletingId(category.id);
    try {
      await deleteBudgetDefault(category.id);
      setEnabled((current) => ({ ...current, [category.id]: false }));
      setValues((current) => ({ ...current, [category.id]: "0" }));
      toast.success("Default budget deleted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete default budget");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        These amounts are copied automatically into each new month. Existing months keep their own edits.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {grouped.map(({ tag, rows }) => {
          if (rows.length === 0) return null;
          return (
            <div key={tag} className="rounded-lg border border-sky-100 bg-sky-50/40 p-3">
              <p className="mb-3 text-sm font-semibold text-muted-foreground">{tagLabels[tag]}</p>
              <div className="flex flex-col gap-2">
                {rows.map((category) => (
                  <div
                    key={category.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-2 sm:grid-cols-[1fr_9rem_auto]"
                  >
                    <Label className="text-sm font-normal">{category.name}</Label>
                    {enabled[category.id] ? (
                      <>
                        <Input
                          type="number"
                          value={values[category.id] ?? ""}
                          onChange={(event) =>
                            setValues((current) => ({ ...current, [category.id]: event.target.value }))
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(category)}
                          disabled={deletingId === category.id || saving}
                          aria-label={`Delete ${category.name} default budget`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="hidden text-sm text-muted-foreground sm:block">No default</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEnabled((current) => ({ ...current, [category.id]: true }));
                            setValues((current) => ({ ...current, [category.id]: current[category.id] ?? "0" }));
                          }}
                        >
                          <Plus className="size-4" />
                          Add
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save default budgets"}
        </Button>
      </div>
    </div>
  );
}
