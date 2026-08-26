"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, ChevronDown, ChevronUp, NotebookPen, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addStickyNote, deleteStickyNote, updateStickyNote } from "@/app/(app)/sticky-notes/actions";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
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
        if (editingId === id) {
          setEditingId(null);
          setEditingBody("");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete note");
      }
    });
  }

  function beginEdit(note: StickyNote) {
    setError(null);
    setEditingId(note.id);
    setEditingBody(note.body);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingBody("");
    setError(null);
  }

  function saveEdit(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        await updateStickyNote(id, editingBody);
        setEditingId(null);
        setEditingBody("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update note");
      }
    });
  }

  if (collapsed) {
    return (
      <div className="fixed right-4 bottom-4 z-30">
        <Button
          type="button"
          onClick={() => setCollapsed(false)}
          className="h-10 rounded-full bg-sky-200 px-3 text-sky-950 shadow-lg shadow-sky-900/15 hover:bg-sky-100"
        >
          <NotebookPen className="size-4" />
          Notes
        </Button>
      </div>
    );
  }

  return (
    <aside className="fixed right-4 bottom-4 z-30 w-[min(252px,calc(100vw-2rem))] rounded-lg border border-sky-200/90 bg-sky-100/95 text-sm text-sky-950 shadow-2xl shadow-sky-950/15 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b border-sky-200/90 px-3 py-2.5">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-sky-300/80 text-sky-950">
            <NotebookPen className="size-4" />
          </span>
          Sticky notes
        </div>
        <Button type="button" variant="ghost" size="icon-xs" onClick={() => setCollapsed(true)} aria-label="Hide notes">
          <ChevronDown className="size-4" />
        </Button>
      </div>

      <div className="space-y-2.5 p-3">
        <form action={submitNote} className="space-y-2">
          <textarea
            name="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Brain dump, reminder, idea..."
            rows={2}
            className="min-h-16 w-full resize-none rounded-lg border border-sky-200 bg-white/80 px-2.5 py-2 text-xs leading-relaxed outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-3 focus:ring-sky-200/70"
          />
          <Button type="submit" size="xs" disabled={isPending || !body.trim()} className="ml-auto flex h-8 bg-sky-600 px-2.5 hover:bg-sky-500">
            <Plus className="size-3.5" />
            Add note
          </Button>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </form>

        <div className="space-y-2">
          {visibleNotes.map((note) => (
            <article key={note.id} className="rounded-lg border border-sky-200/80 bg-white/75 p-2.5 shadow-sm shadow-sky-900/5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <time className="text-xs font-medium text-muted-foreground">{formatNoteDate(note.created_at)}</time>
                <div className="flex items-center gap-1">
                  {editingId === note.id ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => saveEdit(note.id)}
                        disabled={isPending || !editingBody.trim()}
                        aria-label="Save note"
                        className="text-emerald-700 hover:text-emerald-800"
                      >
                        <Check className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={cancelEdit}
                        disabled={isPending}
                        aria-label="Cancel edit"
                        className="text-muted-foreground"
                      >
                        <X className="size-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => beginEdit(note)}
                        disabled={isPending}
                        aria-label="Edit note"
                        className="text-muted-foreground hover:text-sky-700"
                      >
                        <Pencil className="size-3" />
                      </Button>
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
                    </>
                  )}
                </div>
              </div>
              {editingId === note.id ? (
                <textarea
                  value={editingBody}
                  onChange={(event) => setEditingBody(event.target.value)}
                  rows={3}
                  className="min-h-20 w-full resize-none rounded-lg border border-sky-200 bg-white/90 px-2.5 py-2 text-xs leading-relaxed outline-none transition focus:border-sky-300 focus:ring-3 focus:ring-sky-200/70"
                />
              ) : (
                <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">{note.body}</p>
              )}
            </article>
          ))}

          {notes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-sky-300 bg-white/50 p-3 text-xs text-muted-foreground">
              No notes yet.
            </div>
          ) : null}

          {hasMoreNotes ? (
            <Button type="button" variant="outline" size="xs" onClick={() => setExpanded((value) => !value)} className="w-full border-sky-200 bg-white/70">
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              {expanded ? "Show latest 5" : `Show ${notes.length - 5} more`}
            </Button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
