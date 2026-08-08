"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { CategoryTag } from "@/lib/supabase/types";
import { addCategory, setCategoryActive } from "./actions";

interface Category {
  id: string;
  name: string;
  tag: CategoryTag;
  active: boolean;
}

const tagLabels: Record<CategoryTag, string> = {
  income: "Income",
  sinking_fund: "Sinking Fund",
  fixed: "Fixed",
  spent: "Spent",
};

export function CategoriesSection({ categories }: { categories: Category[] }) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState<CategoryTag>("spent");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleAdd() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      await addCategory(name.trim(), tag);
      toast.success("Category added");
      setName("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add category");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    try {
      await setCategoryActive(id, active);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update category");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-2">
          <Label>New category</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Tag</Label>
          <Select value={tag} onValueChange={(v) => setTag(v as CategoryTag)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(tagLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAdd} disabled={saving}>
          Add
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={c.active ? "" : "text-muted-foreground line-through"}>{c.name}</span>
              <Badge variant="secondary">{tagLabels[c.tag]}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => toggleActive(c.id, !c.active)}>
              {c.active ? "Deactivate" : "Activate"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
