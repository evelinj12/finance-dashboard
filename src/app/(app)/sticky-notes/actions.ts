"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const NOTE_REVALIDATION_PATHS = [
  "/",
  "/budget",
  "/saving-health",
  "/transactions",
  "/income",
  "/team",
  "/networth",
  "/exports",
  "/settings",
];

function revalidateNotes() {
  for (const path of NOTE_REVALIDATION_PATHS) {
    revalidatePath(path);
  }
}

export async function addStickyNote(input: string) {
  const body = input.trim();
  if (!body) {
    throw new Error("Note cannot be empty");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("sticky_notes").insert({ body });
  if (error) throw new Error(error.message);

  revalidateNotes();
}

export async function updateStickyNote(id: string, input: string) {
  const noteId = id.trim();
  const body = input.trim();
  if (!noteId) {
    throw new Error("Note is required");
  }
  if (!body) {
    throw new Error("Note cannot be empty");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sticky_notes")
    .update({ body, updated_at: new Date().toISOString() })
    .eq("id", noteId);
  if (error) throw new Error(error.message);

  revalidateNotes();
}

export async function deleteStickyNote(id: string) {
  const noteId = id.trim();
  if (!noteId) {
    throw new Error("Note is required");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("sticky_notes").delete().eq("id", noteId);
  if (error) throw new Error(error.message);

  revalidateNotes();
}
