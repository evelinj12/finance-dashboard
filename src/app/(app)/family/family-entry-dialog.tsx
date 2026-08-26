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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput, type MoneyValue, moneyValueToIdr } from "@/components/money-input";
import type { FamilySupportDirection } from "@/lib/supabase/types";
import { updateFamilySupportEntry, type FamilySupportEntryInput } from "./actions";

interface FamilyEntry {
  id: string;
  month: string;
  entry_date: string | null;
  person: string;
  direction: FamilySupportDirection;
  description: string;
  amount: number;
  currency: string;
  fx_rate: number;
  notes: string | null;
}

export function FamilyEntryDialog({
  entry,
  trigger,
}: {
  entry: FamilyEntry;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [person, setPerson] = useState(entry.person);
  const [entryDate, setEntryDate] = useState(entry.entry_date ?? entry.month);
  const [direction, setDirection] = useState<FamilySupportDirection>(entry.direction);
  const [description, setDescription] = useState(entry.description);
  const [money, setMoney] = useState<MoneyValue>({
    amount: String(entry.amount),
    currency: entry.currency,
    fxRate: String(entry.fx_rate),
  });
  const [notes, setNotes] = useState(entry.notes ?? "");
  const router = useRouter();

  async function handleSave() {
    const input: FamilySupportEntryInput = {
      month: entry.month,
      entry_date: entryDate || null,
      person,
      direction,
      description,
      amount: Number(money.amount),
      currency: money.currency,
      fx_rate: money.currency === "IDR" ? 1 : Number(money.fxRate) || 1,
      amount_idr: moneyValueToIdr(money),
      notes: notes.trim() || null,
    };

    setSaving(true);
    try {
      await updateFamilySupportEntry(entry.id, input);
      toast.success("Family record updated");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update family record");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit family record</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Person</Label>
              <Input value={person} onChange={(event) => setPerson(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Date</Label>
              <Input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} />
            </div>
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
          <MoneyInput value={money} onChange={setMoney} />
          <div className="flex flex-col gap-2">
            <Label>Description</Label>
            <Input value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
