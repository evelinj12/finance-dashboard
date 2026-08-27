"use client";

import { CheckSquare, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  addChecklistItem,
  deleteChecklistItem,
  toggleChecklistItem,
  updateChecklistItem,
} from "./actions";

export type ChecklistStatusFilter = "all" | "open" | "done";
export type ChecklistSort = "custom" | "title" | "latest" | "status";

export interface TransactionChecklistItem {
  id: string;
  month: string;
  title: string;
  latest_date_note: string | null;
  completed: boolean;
  sort_order: number;
}

const statusOptions: Array<{ value: ChecklistStatusFilter; label: string }> = [
  { value: "all", label: "All items" },
  { value: "open", label: "Open only" },
  { value: "done", label: "Done only" },
];

const sortOptions: Array<{ value: ChecklistSort; label: string }> = [
  { value: "custom", label: "Checklist order" },
  { value: "title", label: "Name A-Z" },
  { value: "latest", label: "Latest date" },
  { value: "status", label: "Open first" },
];

export function TransactionChecklist({
  month,
  items,
  statusFilter,
  sort,
}: {
  month: string;
  items: TransactionChecklistItem[];
  statusFilter: ChecklistStatusFilter;
  sort: ChecklistSort;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [latestDateNote, setLatestDateNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLatestDateNote, setEditLatestDateNote] = useState("");

  function updateUrlParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === "all" || value === "custom") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/transactions?${params.toString()}`);
  }

  function handleAdd() {
    startTransition(async () => {
      try {
        await addChecklistItem({
          month,
          title,
          latest_date_note: latestDateNote,
        });
        setTitle("");
        setLatestDateNote("");
        toast.success("Checklist item added");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to add checklist item");
      }
    });
  }

  function handleToggle(id: string, completed: boolean) {
    startTransition(async () => {
      try {
        await toggleChecklistItem(id, completed);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update checklist item");
      }
    });
  }

  function startEdit(item: TransactionChecklistItem) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditLatestDateNote(item.latest_date_note ?? "");
  }

  function handleUpdate(item: TransactionChecklistItem) {
    startTransition(async () => {
      try {
        await updateChecklistItem(item.id, {
          month: item.month,
          title: editTitle,
          latest_date_note: editLatestDateNote,
          completed: item.completed,
        });
        setEditingId(null);
        toast.success("Checklist item updated");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update checklist item");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this checklist item?")) return;
    startTransition(async () => {
      try {
        await deleteChecklistItem(id);
        toast.success("Checklist item deleted");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete checklist item");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="border-b border-sky-100">
        <CardTitle className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <CheckSquare className="size-5 text-sky-600" />
            Monthly checklist
          </span>
          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
            <select
              value={statusFilter}
              onChange={(e) => updateUrlParam("checklistStatus", e.target.value)}
              className="h-11 rounded-lg border border-input bg-white/75 px-3 text-base shadow-sm shadow-sky-950/5 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 sm:h-9 sm:text-sm"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => updateUrlParam("checklistSort", e.target.value)}
              className="h-11 rounded-lg border border-input bg-white/75 px-3 text-base shadow-sm shadow-sky-950/5 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 sm:h-9 sm:text-sm"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-2 md:grid-cols-[minmax(180px,1fr)_minmax(160px,0.75fr)_auto]">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Checklist item" />
          <Input
            value={latestDateNote}
            onChange={(e) => setLatestDateNote(e.target.value)}
            placeholder="Latest date, e.g. 4 each month"
          />
          <Button type="button" onClick={handleAdd} disabled={isPending || !title.trim()}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>

        <div className="rounded-lg border border-sky-100 sm:hidden">
          <div className="divide-y divide-sky-100">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3 px-3 py-3">
                <input
                  type="checkbox"
                  checked={item.completed}
                  disabled={isPending}
                  onChange={(e) => handleToggle(item.id, e.target.checked)}
                  className="mt-1 size-5 shrink-0 rounded border-sky-300 accent-sky-600"
                  aria-label={`Mark ${item.title} complete`}
                />
                <div className="min-w-0 flex-1">
                  {editingId === item.id ? (
                    <div className="grid gap-2">
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                      <Input
                        value={editLatestDateNote}
                        onChange={(e) => setEditLatestDateNote(e.target.value)}
                        placeholder="Latest date"
                      />
                    </div>
                  ) : (
                    <>
                      <p className={item.completed ? "text-muted-foreground line-through" : "font-medium"}>
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.latest_date_note || "No latest date noted"}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex shrink-0 items-start gap-1">
                  {editingId === item.id ? (
                    <>
                      <Button
                        type="button"
                        size="icon-xs"
                        onClick={() => handleUpdate(item)}
                        disabled={isPending || !editTitle.trim()}
                        aria-label="Save checklist item"
                      >
                        <Save className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setEditingId(null)}
                        aria-label="Cancel editing"
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
                        onClick={() => startEdit(item)}
                        aria-label="Edit checklist item"
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDelete(item.id)}
                        aria-label="Delete checklist item"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {items.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                No checklist items match this filter.
              </div>
            ) : null}
          </div>
        </div>

        <div className="hidden overflow-hidden rounded-lg border border-sky-100 sm:block">
          <div className="grid grid-cols-[44px_minmax(0,1fr)_minmax(140px,0.55fr)_88px] bg-sky-50/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span />
            <span>Monthly mandatory</span>
            <span>Latest date</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-sky-100">
            {items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[44px_minmax(0,1fr)_minmax(140px,0.55fr)_88px] items-center gap-0 px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  disabled={isPending}
                  onChange={(e) => handleToggle(item.id, e.target.checked)}
                  className="size-5 rounded border-sky-300 accent-sky-600"
                  aria-label={`Mark ${item.title} complete`}
                />
                {editingId === item.id ? (
                  <>
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    <Input
                      value={editLatestDateNote}
                      onChange={(e) => setEditLatestDateNote(e.target.value)}
                      placeholder="Latest date"
                    />
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        size="icon-xs"
                        onClick={() => handleUpdate(item)}
                        disabled={isPending || !editTitle.trim()}
                        aria-label="Save checklist item"
                      >
                        <Save className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setEditingId(null)}
                        aria-label="Cancel editing"
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className={item.completed ? "text-muted-foreground line-through" : "font-medium"}>
                      {item.title}
                    </span>
                    <span className="text-sm text-muted-foreground">{item.latest_date_note || "-"}</span>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => startEdit(item)}
                        aria-label="Edit checklist item"
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDelete(item.id)}
                        aria-label="Delete checklist item"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {items.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                No checklist items match this filter.
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
