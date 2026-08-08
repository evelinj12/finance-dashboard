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
import { monthStart } from "@/lib/dates";
import { upsertSnapshot } from "./actions";

interface ExistingSnapshot {
  month: string;
  cash: number;
  investments: number;
  retirement: number;
  personal: number;
  unsecured_liabilities: number;
  secured_liabilities: number;
  notes: string | null;
}

const fields: { key: keyof ExistingSnapshot; label: string }[] = [
  { key: "cash", label: "Cash" },
  { key: "investments", label: "Investments" },
  { key: "retirement", label: "Retirement" },
  { key: "personal", label: "Personal (property, vehicles, etc.)" },
  { key: "unsecured_liabilities", label: "Unsecured liabilities" },
  { key: "secured_liabilities", label: "Secured liabilities" },
];

export function SnapshotDialog({
  snapshot,
  trigger,
}: {
  snapshot?: ExistingSnapshot;
  trigger: React.ReactElement;
}) {
  const isEdit = !!snapshot;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState(snapshot?.month ?? monthStart());
  const [values, setValues] = useState<Record<string, string>>({
    cash: String(snapshot?.cash ?? 0),
    investments: String(snapshot?.investments ?? 0),
    retirement: String(snapshot?.retirement ?? 0),
    personal: String(snapshot?.personal ?? 0),
    unsecured_liabilities: String(snapshot?.unsecured_liabilities ?? 0),
    secured_liabilities: String(snapshot?.secured_liabilities ?? 0),
  });
  const [notes, setNotes] = useState(snapshot?.notes ?? "");
  const router = useRouter();

  async function handleSave() {
    setSaving(true);
    try {
      await upsertSnapshot({
        month,
        cash: Number(values.cash) || 0,
        investments: Number(values.investments) || 0,
        retirement: Number(values.retirement) || 0,
        personal: Number(values.personal) || 0,
        unsecured_liabilities: Number(values.unsecured_liabilities) || 0,
        secured_liabilities: Number(values.secured_liabilities) || 0,
        notes: notes || null,
      });
      toast.success("Snapshot saved");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save snapshot");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit snapshot" : "Add monthly snapshot"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Month</Label>
            <Input
              type="month"
              value={month.slice(0, 7)}
              onChange={(e) => setMonth(`${e.target.value}-01`)}
              disabled={isEdit}
            />
          </div>
          {fields.map((f) => (
            <div key={f.key} className="flex flex-col gap-2">
              <Label>{f.label} (IDR)</Label>
              <Input
                type="number"
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex flex-col gap-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save snapshot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
