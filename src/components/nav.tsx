"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Coins,
  Download,
  HandCoins,
  HeartPulse,
  LayoutDashboard,
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

export function Nav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="mobile-scrollbar -mx-1 flex snap-x gap-1 overflow-x-auto rounded-lg bg-white/55 p-1 shadow-inner shadow-sky-900/5 ring-1 ring-sky-100/80 sm:mx-0"
      aria-label="Primary"
    >
      {links.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        const Icon = navIcons[link.id as keyof typeof navIcons] ?? Coins;
        return (
          <Link
            key={link.id}
            href={link.href}
            className={cn(
              "flex h-11 shrink-0 snap-start items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-all duration-200 sm:h-10",
              active
                ? "bg-primary text-primary-foreground shadow-sm shadow-sky-700/20"
                : "text-muted-foreground hover:bg-white hover:text-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
