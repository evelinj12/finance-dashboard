"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput, emptyMoneyValue, moneyValueToIdr, type MoneyValue } from "@/components/money-input";
import type { FamilySupportDirection } from "@/lib/supabase/types";
import { addFamilySupportEntry, type FamilySupportEntryInput } from "./actions";

export function FamilyEntryForm({ selectedMonth }: { selectedMonth: string }) {
  const [person, setPerson] = useState("Sister");
  const [entryDate, setEntryDate] = useState(selectedMonth);
  const [direction, setDirection] = useState<FamilySupportDirection>("add");
  const [description, setDescription] = useState("");
  const [money, setMoney] = useState<MoneyValue>(emptyMoneyValue("IDR"));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSubmit() {
    const input: FamilySupportEntryInput = {
      month: selectedMonth,
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
      await addFamilySupportEntry(input);
      toast.success("Family record added");
      setDescription("");
      setMoney(emptyMoneyValue("IDR"));
      setNotes("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add family record");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(130px,0.8fr)_minmax(130px,0.8fr)_minmax(130px,0.7fr)_minmax(220px,1.4fr)]">
      <div className="flex flex-col gap-2">
        <Label>Person</Label>
        <Input value={person} onChange={(event) => setPerson(event.target.value)} placeholder="e.g. Sister" />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Date</Label>
        <Input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} />
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
      <div className="flex flex-col gap-2 md:col-span-2">
        <Label>Description</Label>
        <Input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="e.g. Petty cash, Apple One, Wifi"
        />
      </div>
      <div className="flex flex-col gap-2 md:col-span-2">
        <Label>Notes</Label>
        <div className="flex gap-2">
          <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note" />
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
}
