"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { NetWorthCategoryGroup } from "@/lib/supabase/types";
import { addNetWorthCategory, deleteNetWorthCategory, updateNetWorthCategory } from "./actions";

interface NetWorthCategory {
  id: string;
  name: string;
  group_name: NetWorthCategoryGroup;
  active: boolean;
}

export function NetWorthCategoriesSection({ categories }: { categories: NetWorthCategory[] }) {
  const [name, setName] = useState("");
  const [groupName, setGroupName] = useState<NetWorthCategoryGroup>("asset");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleAdd() {
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setSaving(true);
    try {
      await addNetWorthCategory(name, groupName);
      toast.success("Category added");
      setName("");
      setGroupName("asset");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add category");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? Existing snapshots may need it, so deleting can fail.")) return;

    try {
      await deleteNetWorthCategory(id);
      toast.success("Category deleted");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete category");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 md:grid-cols-[1fr_180px_auto] md:items-end">
        <div className="flex flex-col gap-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency fund" />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Group</Label>
          <Select value={groupName} onValueChange={(value) => setGroupName(value as NetWorthCategoryGroup)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asset">Asset</SelectItem>
              <SelectItem value="liability">Liability</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAdd} disabled={saving}>
          Add category
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {categories.map((category) => (
          <NetWorthCategoryRow key={category.id} category={category} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}

function NetWorthCategoryRow({
  category,
  onDelete,
}: {
  category: NetWorthCategory;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [groupName, setGroupName] = useState<NetWorthCategoryGroup>(category.group_name);
  const [active, setActive] = useState(category.active);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function reset() {
    setName(category.name);
    setGroupName(category.group_name);
    setActive(category.active);
    setEditing(false);
  }

  async function handleUpdate() {
    setSaving(true);
    try {
      await updateNetWorthCategory(category.id, {
        name,
        group_name: groupName,
        active,
      });
      toast.success("Category updated");
      setEditing(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update category");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="grid gap-2 rounded-md border bg-muted/20 p-3 md:grid-cols-[1fr_160px_120px_auto] md:items-end">
        <div className="flex flex-col gap-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Group</Label>
          <Select value={groupName} onValueChange={(value) => setGroupName(value as NetWorthCategoryGroup)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asset">Asset</SelectItem>
              <SelectItem value="liability">Liability</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Status</Label>
          <Select value={active ? "active" : "inactive"} onValueChange={(value) => setActive(value === "active")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" onClick={handleUpdate} disabled={saving} aria-label="Save net worth category">
            <Check className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={reset} aria-label="Cancel net worth category edit">
            <X className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{category.name}</span>
        <Badge variant="outline" className="capitalize">
          {category.group_name}
        </Badge>
        {!category.active ? (
          <Badge variant="outline" className="text-muted-foreground">
            Inactive
          </Badge>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Edit net worth category">
          <Pencil className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(category.id)} aria-label="Delete net worth category">
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
