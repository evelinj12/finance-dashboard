"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteFamilySupportEntry } from "./actions";

export function DeleteFamilyEntryButton({ id }: { id: string }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Delete this family record?")) return;
    setDeleting(true);
    try {
      await deleteFamilySupportEntry(id);
      toast.success("Family record deleted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete family record");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Button variant="ghost" size="icon-sm" onClick={handleDelete} disabled={deleting} aria-label="Delete family record">
      <Trash2 className="size-4" />
    </Button>
  );
}
