"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteSnapshot } from "./actions";

export function DeleteSnapshotButton({ id }: { id: string }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Delete this snapshot?")) return;
    setDeleting(true);
    try {
      await deleteSnapshot(id);
      toast.success("Snapshot deleted");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
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
