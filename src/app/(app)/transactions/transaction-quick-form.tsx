"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput, emptyMoneyValue, moneyValueToIdr, type MoneyValue } from "@/components/money-input";
import { addTransaction, type TransactionInput } from "./actions";

interface Category {
  id: string;
  name: string;
  tag: string;
}

const tagLabels: Record<string, string> = {
  income: "Income",
  sinking_fund: "Sinking Fund",
  fixed: "Fixed",
  spent: "Spent",
};

export function TransactionQuickForm({
  categories,
  selectedMonth,
}: {
  categories: Category[];
  selectedMonth: string;
}) {
  const [date, setDate] = useState(selectedMonth);
  const [categoryId, setCategoryId] = useState("");
  const [direction, setDirection] = useState<"in" | "out">("out");
  const [money, setMoney] = useState<MoneyValue>(emptyMoneyValue());
  const [notes, setNotes] = useState("");
  const [saveTo, setSaveTo] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function resetForm() {
    setDate(selectedMonth);
    setCategoryId("");
    setDirection("out");
    setMoney(emptyMoneyValue());
    setNotes("");
    setSaveTo("");
    setAdvancedOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!categoryId || !money.amount) {
      toast.error("Category and amount are required");
      return;
    }

    setSaving(true);
    const input: TransactionInput = {
      date,
      category_id: categoryId,
      direction,
      amount: Number(money.amount),
      currency: money.currency,
      fx_rate: money.currency === "IDR" ? 1 : Number(money.fxRate) || 1,
      amount_idr: moneyValueToIdr(money),
      notes: notes || null,
      save_to: saveTo || null,
    };

    try {
      await addTransaction(input);
      toast.success("Transaction added");
      resetForm();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add transaction");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-[minmax(130px,0.75fr)_minmax(180px,1.2fr)_minmax(220px,1.4fr)_minmax(150px,0.9fr)]">
            <div className="flex flex-col gap-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={(value) => setCategoryId(value ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name} - {tagLabels[category.tag] ?? category.tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <MoneyInput value={money} onChange={setMoney} />
            <div className="flex flex-col gap-2">
              <Label>Direction</Label>
              <Select value={direction} onValueChange={(value) => setDirection(value === "in" ? "in" : "out")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="out">Out</SelectItem>
                  <SelectItem value="in">In</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div className="flex flex-col gap-2">
              <Label>Notes</Label>
              <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note" />
            </div>
            <Button type="submit" disabled={saving} className="md:w-36">
              <Save className="size-4" />
              {saving ? "Saving..." : "Submit"}
            </Button>
          </div>

          <div className="flex flex-col gap-3 border-t pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit px-0"
              onClick={() => setAdvancedOpen((open) => !open)}
            >
              <ChevronDown className={`size-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
              Advanced
            </Button>
            {advancedOpen ? (
              <div className="flex flex-col gap-2 md:max-w-sm">
                <Label>Save to</Label>
                <Input
                  value={saveTo}
                  onChange={(event) => setSaveTo(event.target.value)}
                  placeholder="e.g. pasar uang"
                />
              </div>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
