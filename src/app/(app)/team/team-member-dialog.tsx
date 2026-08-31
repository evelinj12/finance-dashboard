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
import { addTeamMember, updateTeamMember, type TeamMemberInput } from "./actions";

interface TeamMember {
  id: string;
  name: string;
  active: boolean;
  default_currency: string;
  notes: string | null;
  access_email?: string | null;
  access_active?: boolean;
}

const currencies = ["IDR", "USD", "AUD"];

export function TeamMemberDialog({
  member,
  trigger,
}: {
  member?: TeamMember;
  trigger: React.ReactElement;
}) {
  const isEdit = !!member;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(member?.name ?? "");
  const [currency, setCurrency] = useState(member?.default_currency ?? "IDR");
  const [active, setActive] = useState(member?.active ?? true);
  const [accessEmail, setAccessEmail] = useState(member?.access_email ?? "");
  const [accessActive, setAccessActive] = useState(member?.access_active ?? true);
  const [notes, setNotes] = useState(member?.notes ?? "");
  const router = useRouter();

  async function handleSave() {
    const input: TeamMemberInput = {
      name,
      default_currency: currency,
      active,
      access_email: accessEmail.trim() || null,
      access_active: accessActive,
      notes: notes.trim() || null,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateTeamMember(member.id, input);
        toast.success("Team member updated");
      } else {
        await addTeamMember(input);
        toast.success("Team member added");
        setName("");
        setCurrency("IDR");
        setActive(true);
        setAccessEmail("");
        setAccessActive(true);
        setNotes("");
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save team member");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit team member" : "Add team member"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="flex flex-col gap-2">
            <Label>Name</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Default currency</Label>
              <Select value={currency} onValueChange={(value) => setCurrency(value ?? "IDR")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select value={active ? "active" : "inactive"} onValueChange={(value) => setActive(value !== "inactive")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Team access email</Label>
            <Input
              value={accessEmail}
              onChange={(event) => setAccessEmail(event.target.value)}
              placeholder="kevin@example.com"
              type="email"
            />
            <p className="text-xs text-muted-foreground">This email can sign in to the Team access portal.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Team access</Label>
            <Select value={accessActive ? "active" : "inactive"} onValueChange={(value) => setAccessActive(value !== "inactive")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Add member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
