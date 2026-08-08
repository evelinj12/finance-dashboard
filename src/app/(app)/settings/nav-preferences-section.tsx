"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { NavLink } from "@/components/nav";
import type { NavPreferences } from "@/components/nav-shell";
import { resetNavPreferences, saveNavPreferences } from "./actions";

const nonHideableNavIds = new Set(["settings"]);

export function NavPreferencesSection({
  links,
  preferences,
}: {
  links: NavLink[];
  preferences: NavPreferences;
}) {
  const initialOrder = useMemo(() => {
    const ids = links.map((link) => link.id);
    return [...preferences.order, ...ids].filter((id, index, allIds) => ids.includes(id) && allIds.indexOf(id) === index);
  }, [links, preferences.order]);
  const [order, setOrder] = useState(initialOrder);
  const [hidden, setHidden] = useState(
    preferences.hidden.filter((id) => !nonHideableNavIds.has(id) && links.some((link) => link.id === id))
  );
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const labels = new Map(links.map((link) => [link.id, link.label]));

  function move(id: string, direction: -1 | 1) {
    const index = order.indexOf(id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return;
    const nextOrder = [...order];
    [nextOrder[index], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[index]];
    setOrder(nextOrder);
  }

  function toggleHidden(id: string) {
    if (nonHideableNavIds.has(id)) return;
    setHidden((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveNavPreferences(order, hidden);
      toast.success("Navigation preferences saved");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save navigation preferences");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    try {
      await resetNavPreferences();
      const defaultOrder = links.map((link) => link.id);
      setOrder(defaultOrder);
      setHidden([]);
      toast.success("Navigation reset");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reset navigation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {order.map((id, index) => {
          const isHidden = hidden.includes(id);
          const canHide = !nonHideableNavIds.has(id);
          return (
            <div key={id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="flex items-center gap-2">
                {isHidden ? <EyeOff className="size-4 text-muted-foreground" /> : <Eye className="size-4 text-muted-foreground" />}
                <span className={isHidden ? "text-muted-foreground line-through" : ""}>{labels.get(id) ?? id}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => move(id, -1)} disabled={index === 0 || saving}>
                  <ArrowUp className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => move(id, 1)} disabled={index === order.length - 1 || saving}>
                  <ArrowDown className="size-4" />
                </Button>
                {canHide ? (
                  <Button variant="ghost" size="sm" onClick={() => toggleHidden(id)} disabled={saving}>
                    {isHidden ? "Show" : "Hide"}
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleReset} disabled={saving}>
          <RotateCcw className="size-4" /> Reset
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save navigation"}
        </Button>
      </div>
    </div>
  );
}
