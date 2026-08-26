"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, NotebookPen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addStickyNote, deleteStickyNote } from "@/app/(app)/sticky-notes/actions";

export interface StickyNote {
  id: string;
  body: string;
  created_at: string;
}

function formatNoteDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function StickyNotes({ notes }: { notes: StickyNote[] }) {
  const [body, setBody] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleNotes = useMemo(() => (expanded ? notes : notes.slice(0, 5)), [expanded, notes]);
  const hasMoreNotes = notes.length > 5;

  function submitNote(formData: FormData) {
    const nextBody = String(formData.get("body") ?? "");
    setError(null);
    startTransition(async () => {
      try {
        await addStickyNote(nextBody);
        setBody("");
        setCollapsed(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save note");
      }
    });
  }

  function removeNote(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        await deleteStickyNote(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete note");
      }
    });
  }

  if (collapsed) {
    return (
      <div className="fixed right-4 bottom-4 z-30">
        <Button
          type="button"
          onClick={() => setCollapsed(false)}
          className="h-11 rounded-full bg-amber-300 px-4 text-slate-900 shadow-lg shadow-sky-900/15 hover:bg-amber-200"
        >
          <NotebookPen className="size-4" />
          Notes
        </Button>
      </div>
    );
  }

  return (
    <aside className="fixed right-4 bottom-4 z-30 w-[min(360px,calc(100vw-2rem))] rounded-lg border border-amber-200/80 bg-amber-50/95 text-sm text-slate-900 shadow-2xl shadow-sky-950/15 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b border-amber-200/80 px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-amber-200 text-amber-900">
            <NotebookPen className="size-4" />
          </span>
          Sticky notes
        </div>
        <Button type="button" variant="ghost" size="icon-xs" onClick={() => setCollapsed(true)} aria-label="Hide notes">
          <ChevronDown className="size-4" />
        </Button>
      </div>

      <div className="space-y-3 p-4">
        <form action={submitNote} className="space-y-2">
          <textarea
            name="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Brain dump, reminder, idea..."
            rows={3}
            className="min-h-20 w-full resize-none rounded-lg border border-amber-200 bg-white/80 px-3 py-2 outline-none transition focus:border-amber-300 focus:ring-3 focus:ring-amber-200/60"
          />
          <Button type="submit" size="sm" disabled={isPending || !body.trim()} className="w-full bg-sky-600 hover:bg-sky-500">
            <Plus className="size-4" />
            Add note
          </Button>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </form>

        <div className="space-y-2">
          {visibleNotes.map((note) => (
            <article key={note.id} className="rounded-lg border border-amber-200/70 bg-white/75 p-3 shadow-sm shadow-amber-900/5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <time className="text-xs font-medium text-muted-foreground">{formatNoteDate(note.created_at)}</time>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeNote(note.id)}
                  disabled={isPending}
                  aria-label="Delete note"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
              <p className="whitespace-pre-wrap break-words leading-relaxed">{note.body}</p>
            </article>
          ))}

          {notes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-amber-300 bg-white/50 p-3 text-muted-foreground">
              No notes yet.
            </div>
          ) : null}

          {hasMoreNotes ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setExpanded((value) => !value)} className="w-full border-amber-200 bg-white/70">
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              {expanded ? "Show latest 5" : `Show ${notes.length - 5} more`}
            </Button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
