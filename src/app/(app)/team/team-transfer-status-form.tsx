"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Money } from "@/components/money";
import { todayStr } from "@/lib/dates";
import type { TeamTransferStatus } from "@/lib/supabase/types";
import { saveTeamTransferStatus, type TeamTransferInput } from "./actions";

export interface TeamTransferPerson {
  id: string;
  name: string;
  amountToSendIdr: number;
  status: TeamTransferStatus;
  transferredAt: string | null;
  notes: string | null;
}

const statusLabels: Record<TeamTransferStatus, string> = {
  not_transferred: "Not transferred",
  transferred: "Transferred",
};

export function TeamTransferStatusForm({
  selectedMonth,
  people,
}: {
  selectedMonth: string;
  people: TeamTransferPerson[];
}) {
  const [personId, setPersonId] = useState(people[0]?.id ?? "");
  const currentPerson = people.find((person) => person.id === personId) ?? people[0];
  const [status, setStatus] = useState<TeamTransferStatus>(currentPerson?.status ?? "not_transferred");
  const [transferredAt, setTransferredAt] = useState(currentPerson?.transferredAt ?? todayStr());
  const [notes, setNotes] = useState(currentPerson?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function handlePersonChange(value: string | null) {
    const nextPerson = people.find((person) => person.id === value) ?? people[0];
    if (!nextPerson) return;

    setPersonId(nextPerson.id);
    setStatus(nextPerson.status);
    setTransferredAt(nextPerson.transferredAt ?? todayStr());
    setNotes(nextPerson.notes ?? "");
  }

  async function handleSave() {
    if (!currentPerson) {
      toast.error("Team member is required");
      return;
    }

    const input: TeamTransferInput = {
      month: selectedMonth,
      team_member_id: currentPerson.id,
      status,
      transferred_at: status === "transferred" ? transferredAt : null,
      notes: notes.trim() || null,
    };

    setSaving(true);
    try {
      await saveTeamTransferStatus(input);
      toast.success("Team transfer saved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save Team transfer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[minmax(140px,0.8fr)_minmax(180px,0.9fr)_minmax(160px,0.9fr)_minmax(220px,1.3fr)_auto] md:items-end">
          <div className="flex flex-col gap-2">
            <Label>Person</Label>
            <Select value={personId} onValueChange={handlePersonChange} disabled={people.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Select person" />
              </SelectTrigger>
              <SelectContent>
                {people.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value === "transferred" ? "transferred" : "not_transferred")
              }
              disabled={people.length === 0}
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
              disabled={status !== "transferred" || people.length === 0}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} disabled={people.length === 0} />
          </div>
          <Button onClick={handleSave} disabled={saving || people.length === 0}>
            <Save className="size-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>

        {currentPerson ? (
          <div className="rounded-lg border border-sky-100 bg-sky-50/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{currentPerson.name}</h3>
                <p className="mt-3 text-sm text-muted-foreground">Amount to send</p>
                <Money amountIdr={currentPerson.amountToSendIdr} className="text-lg font-semibold text-emerald-700" />
              </div>
              <Badge variant={status === "transferred" ? "secondary" : "outline"}>
                {statusLabels[status]}
              </Badge>
            </div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Transferred at</p>
                <p className="font-medium">{status === "transferred" ? transferredAt : currentPerson.transferredAt ?? "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Notes</p>
                <p className="font-medium">{notes.trim() || currentPerson.notes || "-"}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-sky-100 bg-sky-50/50 p-4 text-sm text-muted-foreground">
            Add a team member before recording transfer status.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
