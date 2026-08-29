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
  const personItems = people.map((person) => ({ value: person.id, label: person.name }));
  const statusItems = [
    { value: "not_transferred", label: "Not transferred" },
    { value: "transferred", label: "Transferred" },
  ];

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
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.5fr)_auto] md:items-end">
          <div className="flex min-w-0 flex-col gap-2">
            <Label>Person</Label>
            <Select items={personItems} value={personId} onValueChange={handlePersonChange} disabled={people.length === 0}>
              <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder="Select person" />
              </SelectTrigger>
              <SelectContent align="start">
                {people.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <Label>Status</Label>
            <Select
              items={statusItems}
              value={status}
              onValueChange={(value) =>
                setStatus(value === "transferred" ? "transferred" : "not_transferred")
              }
              disabled={people.length === 0}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="not_transferred">Not transferred</SelectItem>
                <SelectItem value="transferred">Transferred</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <Label>Transferred date</Label>
            <Input
              type="date"
              value={transferredAt}
              onChange={(event) => setTransferredAt(event.target.value)}
              disabled={status !== "transferred" || people.length === 0}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} disabled={people.length === 0} />
          </div>
          <Button onClick={handleSave} disabled={saving || people.length === 0}>
            <Save className="size-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>

        {people.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2">
            {people.map((person) => (
              <div key={person.id} className="rounded-md border bg-white/55 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{person.name}</p>
                  <Badge variant={person.status === "transferred" ? "secondary" : "outline"}>
                    {statusLabels[person.status]}
                  </Badge>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Amount to send</p>
                    <Money amountIdr={person.amountToSendIdr} className="font-medium text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Transferred at</p>
                    <p className="font-medium">{person.transferredAt ?? "-"}</p>
                  </div>
                </div>
                {person.notes ? <p className="mt-2 text-sm text-muted-foreground">{person.notes}</p> : null}
              </div>
            ))}
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
