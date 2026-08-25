"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/money";
import { addSinkingFund, deleteSinkingFund, updateSinkingFund } from "./actions";

interface SinkingFund {
  id: string;
  name: string;
  monthly_amount: number;
  due_date: string | null;
  rolling: boolean;
  notes: string | null;
}

export function SinkingFundsSection({ funds }: { funds: SinkingFund[] }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleAdd() {
    if (!name.trim() || !amount) {
      toast.error("Name and amount are required");
      return;
    }
    setSaving(true);
    try {
      await addSinkingFund({
        name: name.trim(),
        monthly_amount: Number(amount),
        due_date: dueDate || null,
        rolling: !dueDate,
        notes: notes.trim() || null,
      });
      toast.success("Sinking fund added");
      setName("");
      setAmount("");
      setDueDate("");
      setNotes("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add sinking fund");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this sinking fund?")) return;
    try {
      await deleteSinkingFund(id);
      toast.success("Deleted");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rent" />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Monthly amount (IDR)</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Due date (optional, blank = rolling)</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>
        <Button onClick={handleAdd} disabled={saving}>
          Add
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {funds.map((f) => (
          <SinkingFundRow key={f.id} fund={f} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}

function SinkingFundRow({
  fund,
  onDelete,
}: {
  fund: SinkingFund;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(fund.name);
  const [amount, setAmount] = useState(String(fund.monthly_amount));
  const [dueDate, setDueDate] = useState(fund.due_date ?? "");
  const [notes, setNotes] = useState(fund.notes ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function reset() {
    setName(fund.name);
    setAmount(String(fund.monthly_amount));
    setDueDate(fund.due_date ?? "");
    setNotes(fund.notes ?? "");
    setEditing(false);
  }

  async function handleUpdate() {
    if (!name.trim() || !amount) {
      toast.error("Name and amount are required");
      return;
    }

    setSaving(true);
    try {
      await updateSinkingFund(fund.id, {
        name: name.trim(),
        monthly_amount: Number(amount),
        due_date: dueDate || null,
        rolling: !dueDate,
        notes: notes.trim() || null,
      });
      toast.success("Sinking fund updated");
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
      <div className="grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_1.2fr_auto] md:items-end">
        <div className="flex flex-col gap-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Monthly amount</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Due date</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" onClick={handleUpdate} disabled={saving} aria-label="Save sinking fund">
            <Check className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={reset} aria-label="Cancel sinking fund edit">
            <X className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2">
      <div>
        <div className="font-medium">{fund.name}</div>
        <div className="text-sm text-muted-foreground">
          {fund.rolling ? "Rolling" : fund.due_date}
          {fund.notes ? ` · ${fund.notes}` : ""}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Money amountIdr={fund.monthly_amount} className="text-sm" />
        <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Edit sinking fund">
          <Pencil className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(fund.id)} aria-label="Delete sinking fund">
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
