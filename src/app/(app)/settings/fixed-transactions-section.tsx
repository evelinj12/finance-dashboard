"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Money } from "@/components/money";
import {
  addFixedTransaction,
  deleteFixedTransaction,
  updateFixedTransaction,
  type FixedTransactionInput,
} from "./actions";

interface FixedCategory {
  id: string;
  name: string;
}

interface FixedTransaction {
  id: string;
  category_id: string;
  name: string;
  monthly_amount: number;
  due_day: number;
  active: boolean;
  notes: string | null;
  category: { name: string } | { name: string }[] | null;
}

function relatedName(value: FixedTransaction["category"]) {
  if (Array.isArray(value)) return value[0]?.name ?? "-";
  return value?.name ?? "-";
}

function fixedInput({
  categoryId,
  name,
  amount,
  dueDay,
  active,
  notes,
}: {
  categoryId: string;
  name: string;
  amount: string;
  dueDay: string;
  active: boolean;
  notes: string;
}): FixedTransactionInput {
  return {
    category_id: categoryId,
    name,
    monthly_amount: Number(amount),
    due_day: Number(dueDay),
    active,
    notes: notes || null,
  };
}

export function FixedTransactionsSection({
  fixedTransactions,
  categories,
}: {
  fixedTransactions: FixedTransaction[];
  categories: FixedCategory[];
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const categoryItems = categories.map((category) => ({ value: category.id, label: category.name }));

  async function handleAdd() {
    if (!categoryId || !name.trim() || !amount) {
      toast.error("Category, name, and amount are required");
      return;
    }

    setSaving(true);
    try {
      await addFixedTransaction(
        fixedInput({
          categoryId,
          name: name.trim(),
          amount,
          dueDay,
          active: true,
          notes: notes.trim(),
        })
      );
      toast.success("Fixed transaction added");
      setName("");
      setAmount("");
      setDueDay("1");
      setNotes("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add fixed transaction");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this fixed transaction schedule? Existing transaction rows will stay available.")) return;
    try {
      await deleteFixedTransaction(id);
      toast.success("Fixed transaction deleted");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        These are the fixed monthly rows the dashboard can add automatically when a new month begins.
      </p>

      <div className="grid gap-3 rounded-lg border border-sky-100 bg-sky-50/50 p-3 md:grid-cols-[1fr_1.1fr_0.8fr_0.6fr_1.2fr_auto] md:items-end">
        <div className="flex flex-col gap-2">
          <Label>Category</Label>
          <Select items={categoryItems} value={categoryId} onValueChange={(value) => setCategoryId(value ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. WiFi MyRepublic" />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Monthly amount</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Due day</Label>
          <Input type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>
        <Button onClick={handleAdd} disabled={saving}>
          {saving ? "Saving..." : "Add"}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {fixedTransactions.map((fixed) => (
          <FixedTransactionRow
            key={fixed.id}
            fixedTransaction={fixed}
            categories={categories}
            onDelete={handleDelete}
          />
        ))}
        {fixedTransactions.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No fixed transaction schedules yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FixedTransactionRow({
  fixedTransaction,
  categories,
  onDelete,
}: {
  fixedTransaction: FixedTransaction;
  categories: FixedCategory[];
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [categoryId, setCategoryId] = useState(fixedTransaction.category_id);
  const [name, setName] = useState(fixedTransaction.name);
  const [amount, setAmount] = useState(String(fixedTransaction.monthly_amount));
  const [dueDay, setDueDay] = useState(String(fixedTransaction.due_day));
  const [active, setActive] = useState(fixedTransaction.active);
  const [notes, setNotes] = useState(fixedTransaction.notes ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const categoryItems = categories.map((category) => ({ value: category.id, label: category.name }));

  function reset() {
    setCategoryId(fixedTransaction.category_id);
    setName(fixedTransaction.name);
    setAmount(String(fixedTransaction.monthly_amount));
    setDueDay(String(fixedTransaction.due_day));
    setActive(fixedTransaction.active);
    setNotes(fixedTransaction.notes ?? "");
    setEditing(false);
  }

  async function handleUpdate() {
    if (!categoryId || !name.trim() || !amount) {
      toast.error("Category, name, and amount are required");
      return;
    }

    setSaving(true);
    try {
      await updateFixedTransaction(
        fixedTransaction.id,
        fixedInput({
          categoryId,
          name: name.trim(),
          amount,
          dueDay,
          active,
          notes: notes.trim(),
        })
      );
      toast.success("Fixed transaction updated");
      setEditing(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-[1fr_1.1fr_0.8fr_0.6fr_0.6fr_1.2fr_auto] md:items-end">
        <div className="flex flex-col gap-2">
          <Label>Category</Label>
          <Select items={categoryItems} value={categoryId} onValueChange={(value) => setCategoryId(value ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Amount</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Due day</Label>
          <Input type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm font-medium">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>
        <div className="flex flex-col gap-2">
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" onClick={handleUpdate} disabled={saving} aria-label="Save fixed transaction">
            <Check className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={reset} aria-label="Cancel fixed transaction edit">
            <X className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2">
      <div>
        <div className="font-medium">{fixedTransaction.name}</div>
        <div className="text-sm text-muted-foreground">
          {relatedName(fixedTransaction.category)} · day {fixedTransaction.due_day}
          {fixedTransaction.active ? "" : " · inactive"}
          {fixedTransaction.notes ? ` · ${fixedTransaction.notes}` : ""}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Money amountIdr={fixedTransaction.monthly_amount} className="text-sm" />
        <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Edit fixed transaction">
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(fixedTransaction.id)}
          aria-label="Delete fixed transaction"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
