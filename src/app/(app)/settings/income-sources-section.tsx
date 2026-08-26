"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import type { IncomeSourceType } from "@/lib/supabase/types";
import {
  addIncomeSourceSetting,
  deleteIncomeSource,
  setIncomeSourceActive,
  updateIncomeSource,
  type IncomeSourceInput,
} from "./actions";

interface IncomeSource {
  id: string;
  name: string;
  type: IncomeSourceType;
  notes: string | null;
  active: boolean;
  visible_in_active_breakdown: boolean;
}

const typeLabels: Record<IncomeSourceType, string> = {
  freelance_client: "Freelance client",
  digital_product: "Digital product",
  other: "Other",
};

function SourceDialog({
  source,
  trigger,
}: {
  source?: IncomeSource;
  trigger: React.ReactElement;
}) {
  const isEdit = !!source;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(source?.name ?? "");
  const [type, setType] = useState<IncomeSourceType>(source?.type ?? "freelance_client");
  const [active, setActive] = useState(source?.active ?? true);
  const [visible, setVisible] = useState(source?.visible_in_active_breakdown ?? true);
  const [notes, setNotes] = useState(source?.notes ?? "");
  const router = useRouter();

  async function handleSave() {
    const input: IncomeSourceInput = {
      name,
      type,
      active,
      visible_in_active_breakdown: visible,
      notes: notes.trim() || null,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateIncomeSource(source.id, input);
        toast.success("Source updated");
      } else {
        await addIncomeSourceSetting(input);
        toast.success("Source added");
        setName("");
        setType("freelance_client");
        setActive(true);
        setVisible(true);
        setNotes("");
      }
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save source");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit source" : "Add source"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="flex flex-col gap-2">
            <Label>Name</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Agentea" />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(value) => {
                if (value) setType(value as IncomeSourceType);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} />
            Show in active client breakdown
          </label>
          <div className="flex flex-col gap-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save source"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function IncomeSourcesSection({ sources }: { sources: IncomeSource[] }) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const router = useRouter();

  async function toggleActive(source: IncomeSource) {
    setSavingId(source.id);
    try {
      await setIncomeSourceActive(source.id, !source.active);
      toast.success(source.active ? "Source deactivated" : "Source activated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update source");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(source: IncomeSource) {
    if (!confirm("Delete this source? Sources with history can be deactivated instead.")) return;
    setSavingId(source.id);
    try {
      await deleteIncomeSource(source.id);
      toast.success("Source deleted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete source");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <SourceDialog
          trigger={
            <Button size="sm">
              <Plus className="size-4" />
              Source
            </Button>
          }
        />
      </div>

      <div className="flex flex-col divide-y rounded-md border bg-white/50">
        {sources.map((source) => (
          <div key={source.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={source.active ? "font-medium" : "font-medium text-muted-foreground line-through"}>
                  {source.name}
                </span>
                <Badge variant="secondary">{typeLabels[source.type]}</Badge>
                <Badge variant={source.active ? "secondary" : "outline"}>
                  {source.active ? "Active" : "Inactive"}
                </Badge>
                {!source.visible_in_active_breakdown ? <Badge variant="outline">Hidden from active</Badge> : null}
              </div>
              {source.notes ? <p className="mt-1 text-sm text-muted-foreground">{source.notes}</p> : null}
            </div>
            <div className="flex items-center justify-end gap-1">
              <SourceDialog
                source={source}
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label={`Edit ${source.name}`}>
                    <Pencil className="size-4" />
                  </Button>
                }
              />
              <Button variant="ghost" size="sm" onClick={() => toggleActive(source)} disabled={savingId === source.id}>
                {source.active ? "Deactivate" : "Activate"}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleDelete(source)}
                disabled={savingId === source.id}
                aria-label={`Delete ${source.name}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        {sources.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            No income sources yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
