"use client";

import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Coins,
  Download,
  HandCoins,
  HeartPulse,
  LayoutDashboard,
  LoaderCircle,
  ReceiptText,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavLink {
  id: string;
  href: string;
  label: string;
}

const navIcons = {
  overview: LayoutDashboard,
  budget: ShieldCheck,
  "saving-health": HeartPulse,
  transactions: ReceiptText,
  income: WalletCards,
  team: Users,
  family: HandCoins,
  networth: BarChart3,
  exports: Download,
  settings: Settings,
} satisfies Record<string, ComponentType<{ className?: string }>>;

function isActiveHref(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Nav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const visiblePendingHref =
    pendingHref && !isActiveHref(pendingHref, pathname) ? pendingHref : null;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      links.forEach((link) => {
        if (!isActiveHref(link.href, pathname)) {
          router.prefetch(link.href);
        }
      });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [links, pathname, router]);

  return (
    <nav
      className="mobile-scrollbar -mx-1 flex snap-x gap-1 overflow-x-auto rounded-lg bg-white/55 p-1 shadow-inner shadow-sky-900/5 ring-1 ring-sky-100/80 sm:mx-0"
      aria-label="Primary"
    >
      {links.map((link) => {
        const active = isActiveHref(link.href, pathname);
        const pending = visiblePendingHref === link.href;
        const selected = visiblePendingHref ? visiblePendingHref === link.href : active;
        const Icon = navIcons[link.id as keyof typeof navIcons] ?? Coins;
        return (
          <Link
            key={link.id}
            href={link.href}
            prefetch
            onMouseEnter={() => router.prefetch(link.href)}
            onFocus={() => router.prefetch(link.href)}
            onTouchStart={() => router.prefetch(link.href)}
            onClick={(event) => {
              if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                active
              ) {
                return;
              }
              setPendingHref(link.href);
            }}
            className={cn(
              "relative flex h-11 shrink-0 snap-start items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-all duration-200 sm:h-10",
              selected
                ? "bg-primary text-primary-foreground shadow-sm shadow-sky-700/20"
                : "text-muted-foreground hover:bg-white hover:text-foreground",
              pending ? "pr-8" : ""
            )}
            aria-current={active ? "page" : undefined}
            aria-busy={pending ? "true" : undefined}
          >
            <Icon className="size-4" />
            {link.label}
            {pending ? (
              <LoaderCircle className="absolute right-2 size-3.5 animate-spin" aria-hidden="true" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
