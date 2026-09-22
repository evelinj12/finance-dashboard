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
import { MoneyInput, emptyMoneyValue, moneyValueToIdr, type MoneyValue } from "@/components/money-input";
import type { FamilySupportDirection } from "@/lib/supabase/types";
import {
  addFamilyRoutineEntry,
  deleteFamilyRoutineEntry,
  updateFamilyRoutineEntry,
  type FamilyRoutineEntryInput,
} from "./actions";

interface FamilyRoutineEntry {
  id: string;
  person: string;
  direction: FamilySupportDirection;
  description: string;
  monthly_amount: number;
  currency: string;
  fx_rate: number;
  amount_idr: number;
  entry_day: number;
  active: boolean;
  notes: string | null;
}

function labelForDirection(direction: FamilySupportDirection) {
  return direction === "add" ? "Tambah" : "Potong";
}

function routineInput({
  person,
  direction,
  description,
  money,
  entryDay,
  active,
  notes,
}: {
  person: string;
  direction: FamilySupportDirection;
  description: string;
  money: MoneyValue;
  entryDay: string;
  active: boolean;
  notes: string;
}): FamilyRoutineEntryInput {
  return {
    person,
    direction,
    description,
    monthly_amount: Number(money.amount),
    currency: money.currency,
    fx_rate: money.currency === "IDR" ? 1 : Number(money.fxRate) || 1,
    amount_idr: moneyValueToIdr(money),
    entry_day: Number(entryDay),
    active,
    notes: notes.trim() || null,
  };
}

export function FamilyRoutinesSection({ routines }: { routines: FamilyRoutineEntry[] }) {
  const [person, setPerson] = useState("Sister");
  const [direction, setDirection] = useState<FamilySupportDirection>("add");
  const [description, setDescription] = useState("");
  const [money, setMoney] = useState<MoneyValue>(emptyMoneyValue("IDR"));
  const [entryDay, setEntryDay] = useState("1");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleAdd() {
    if (!person.trim() || !description.trim() || !money.amount) {
      toast.error("Person, description, and amount are required");
      return;
    }

    setSaving(true);
    try {
      await addFamilyRoutineEntry(
        routineInput({
          person: person.trim(),
          direction,
          description: description.trim(),
          money,
          entryDay,
          active: true,
          notes,
        })
      );
      toast.success("Family routine added");
      setDescription("");
      setMoney(emptyMoneyValue("IDR"));
      setNotes("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add family routine");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this family routine? Existing family records will stay available.")) return;
    try {
      await deleteFamilyRoutineEntry(id);
      toast.success("Family routine deleted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete family routine");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        These routine Family records are added automatically when a new month is prepared. They are record-only; payments still belong in Transactions as expenses.
      </p>

      <div className="grid gap-3 rounded-lg border border-sky-100 bg-sky-50/50 p-3 md:grid-cols-[0.8fr_0.65fr_1.3fr_1fr_0.55fr_1fr_auto] md:items-end">
        <div className="flex flex-col gap-2">
          <Label>Person</Label>
          <Input value={person} onChange={(event) => setPerson(event.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Type</Label>
          <Select value={direction} onValueChange={(value) => setDirection(value === "deduct" ? "deduct" : "add")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="add">Tambah</SelectItem>
              <SelectItem value="deduct">Potong</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Description</Label>
          <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="petty cash + apple one" />
        </div>
        <MoneyInput value={money} onChange={setMoney} />
        <div className="flex flex-col gap-2">
          <Label>Day</Label>
          <Input type="number" min={1} max={31} value={entryDay} onChange={(event) => setEntryDay(event.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Notes</Label>
          <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" />
        </div>
        <Button onClick={handleAdd} disabled={saving}>
          {saving ? "Saving..." : "Add"}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {routines.map((routine) => (
          <FamilyRoutineRow key={routine.id} routine={routine} onDelete={handleDelete} />
        ))}
        {routines.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No family routines yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FamilyRoutineRow({
  routine,
  onDelete,
}: {
  routine: FamilyRoutineEntry;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [person, setPerson] = useState(routine.person);
  const [direction, setDirection] = useState<FamilySupportDirection>(routine.direction);
  const [description, setDescription] = useState(routine.description);
  const [money, setMoney] = useState<MoneyValue>({
    amount: String(routine.monthly_amount),
    currency: routine.currency,
    fxRate: String(routine.fx_rate),
  });
  const [entryDay, setEntryDay] = useState(String(routine.entry_day));
  const [active, setActive] = useState(routine.active);
  const [notes, setNotes] = useState(routine.notes ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function reset() {
    setPerson(routine.person);
    setDirection(routine.direction);
    setDescription(routine.description);
    setMoney({ amount: String(routine.monthly_amount), currency: routine.currency, fxRate: String(routine.fx_rate) });
    setEntryDay(String(routine.entry_day));
    setActive(routine.active);
    setNotes(routine.notes ?? "");
    setEditing(false);
  }

  async function handleUpdate() {
    if (!person.trim() || !description.trim() || !money.amount) {
      toast.error("Person, description, and amount are required");
      return;
    }

    setSaving(true);
    try {
      await updateFamilyRoutineEntry(
        routine.id,
        routineInput({
          person: person.trim(),
          direction,
          description: description.trim(),
          money,
          entryDay,
          active,
          notes,
        })
      );
      toast.success("Family routine updated");
      setEditing(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update family routine");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-[0.8fr_0.65fr_1.3fr_1fr_0.55fr_0.6fr_1fr_auto] md:items-end">
        <div className="flex flex-col gap-2">
          <Label>Person</Label>
          <Input value={person} onChange={(event) => setPerson(event.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Type</Label>
          <Select value={direction} onValueChange={(value) => setDirection(value === "deduct" ? "deduct" : "add")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="add">Tambah</SelectItem>
              <SelectItem value="deduct">Potong</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Description</Label>
          <Input value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <MoneyInput value={money} onChange={setMoney} />
        <div className="flex flex-col gap-2">
          <Label>Day</Label>
          <Input type="number" min={1} max={31} value={entryDay} onChange={(event) => setEntryDay(event.target.value)} />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm font-medium">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Active
        </label>
        <div className="flex flex-col gap-2">
          <Label>Notes</Label>
          <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" onClick={handleUpdate} disabled={saving} aria-label="Save family routine">
            <Check className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={reset} aria-label="Cancel family routine edit">
            <X className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2">
      <div>
        <div className="font-medium">{routine.description}</div>
        <div className="text-sm text-muted-foreground">
          {routine.person} · {labelForDirection(routine.direction)} · day {routine.entry_day}
          {routine.active ? "" : " · inactive"}
          {routine.notes ? ` · ${routine.notes}` : ""}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Money amountIdr={routine.direction === "deduct" ? -routine.amount_idr : routine.amount_idr} signed className="text-sm" />
        <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Edit family routine">
          <Pencil className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(routine.id)} aria-label="Delete family routine">
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
