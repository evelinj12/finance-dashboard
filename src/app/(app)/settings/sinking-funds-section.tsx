"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/money";
import { addSinkingFund, deleteSinkingFund } from "./actions";

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
        notes: null,
      });
      toast.success("Sinking fund added");
      setName("");
      setAmount("");
      setDueDate("");
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
        <Button onClick={handleAdd} disabled={saving}>
          Add
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {funds.map((f) => (
          <div key={f.id} className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <span className="font-medium">{f.name}</span>{" "}
              <span className="text-sm text-muted-foreground">
                {f.rolling ? "Rolling" : f.due_date}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Money amountIdr={f.monthly_amount} className="text-sm" />
              <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
