"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteTeamWorkEntry } from "./actions";

export function DeleteTeamWorkButton({ id }: { id: string }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Delete this team work entry?")) return;
    setDeleting(true);
    try {
      await deleteTeamWorkEntry(id);
      toast.success("Team work deleted");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete team work");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleDelete} disabled={deleting}>
      <Trash2 className="size-4" />
    </Button>
  );
}
