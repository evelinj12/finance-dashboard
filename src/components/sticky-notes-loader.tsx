import { StickyNotes } from "@/components/sticky-notes";
import { createClient } from "@/lib/supabase/server";

export async function StickyNotesLoader() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sticky_notes")
    .select("id, body, created_at")
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    console.error(`Failed to load sticky notes: ${error.message}`);
    return <StickyNotes notes={[]} />;
  }

  return <StickyNotes notes={data ?? []} />;
}
