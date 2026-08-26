"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FamilyTransferStatus } from "@/lib/supabase/types";
import { todayStr } from "@/lib/dates";
import { upsertFamilyTransfer, type FamilyTransferInput } from "./actions";

interface Transfer {
  id: string;
  person: string;
  status: FamilyTransferStatus;
  transferred_at: string | null;
  notes: string | null;
}

export function FamilyTransferForm({
  selectedMonth,
  people,
  transfers,
}: {
  selectedMonth: string;
  people: string[];
  transfers: Transfer[];
}) {
  const defaultPerson = people[0] ?? "Sister";
  const [person, setPerson] = useState(defaultPerson);
  const currentTransfer = transfers.find((transfer) => transfer.person === person);
  const [status, setStatus] = useState<FamilyTransferStatus>(currentTransfer?.status ?? "not_transferred");
  const [transferredAt, setTransferredAt] = useState(currentTransfer?.transferred_at ?? todayStr());
  const [notes, setNotes] = useState(currentTransfer?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function handlePersonChange(value: string | null) {
    const nextPerson = value || defaultPerson;
    const nextTransfer = transfers.find((transfer) => transfer.person === nextPerson);
    setPerson(nextPerson);
    setStatus(nextTransfer?.status ?? "not_transferred");
    setTransferredAt(nextTransfer?.transferred_at ?? todayStr());
    setNotes(nextTransfer?.notes ?? "");
  }

  async function handleSave() {
    const input: FamilyTransferInput = {
      month: selectedMonth,
      person,
      status,
      transferred_at: status === "transferred" ? transferredAt : null,
      notes: notes.trim() || null,
    };

    setSaving(true);
    try {
      await upsertFamilyTransfer(input);
      toast.success("Transfer status saved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save transfer status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(130px,1fr)_minmax(160px,1fr)_minmax(150px,1fr)_minmax(220px,1.3fr)_auto] md:items-end">
      <div className="flex flex-col gap-2">
        <Label>Person</Label>
        <Select value={person} onValueChange={handlePersonChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {people.length > 0 ? (
              people.map((personOption) => (
                <SelectItem key={personOption} value={personOption}>
                  {personOption}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="Sister">Sister</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Status</Label>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value === "transferred" ? "transferred" : "not_transferred")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="not_transferred">Not transferred</SelectItem>
            <SelectItem value="transferred">Transferred</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Transferred date</Label>
        <Input
          type="date"
          value={transferredAt}
          onChange={(event) => setTransferredAt(event.target.value)}
          disabled={status !== "transferred"}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Notes</Label>
        <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
