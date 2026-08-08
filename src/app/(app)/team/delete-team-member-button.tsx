"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteTeamMember, setTeamMemberActive } from "./actions";

export function DeleteTeamMemberButton({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function toggleActive() {
    setSaving(true);
    try {
      await setTeamMemberActive(id, !active);
      toast.success(active ? "Team member deactivated" : "Team member activated");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update team member");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this team member? Members with work entries can be deactivated instead.")) return;
    setSaving(true);
    try {
      await deleteTeamMember(id);
      toast.success("Team member deleted");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete team member");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="sm" onClick={toggleActive} disabled={saving}>
        {active ? "Deactivate" : "Activate"}
      </Button>
      <Button variant="ghost" size="icon" onClick={handleDelete} disabled={saving}>
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
