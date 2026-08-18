"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { allNavItems, type AppNavItem } from "@/config/nav";
import {
  FilePlus2,
  Handshake,
  FileText,
  Settings,
  BarChart3,
  Search,
  CornerDownLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type CommandItem =
  | (AppNavItem & { kind: "nav" })
  | {
      kind: "action";
      title: string;
      icon: LucideIcon;
      href?: string;
      action?: string;
    };

const extraActions: CommandItem[] = [
  {
    kind: "action",
    title: "مشتری جدید",
    icon: FilePlus2,
    href: "/contacts/new",
  },
  {
    kind: "action",
    title: "فروش جدید",
    icon: Handshake,
    href: "/pipeline/deals/new",
  },
  {
    kind: "action",
    title: "فاکتور جدید",
    icon: FileText,
    href: "/invoices/new",
  },
  {
    kind: "action",
    title: "رفتن به تنظیمات",
    icon: Settings,
    href: "/settings",
  },
  {
    kind: "action",
    title: "رفتن به گزارشها",
    icon: BarChart3,
    href: "/reports",
  },
];

function fuzzyMatch(text: string, query: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
    if (lowerText[ti] === lowerQuery[qi]) qi++;
  }
  return qi === lowerQuery.length;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);

  const navItems: CommandItem[] = useMemo(
    () => allNavItems.map((item) => ({ ...item, kind: "nav" as const })),
    []
  );

  const allItems = useMemo(() => [...navItems, ...extraActions], [navItems]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems;
    return allItems.filter((item) => fuzzyMatch(item.title, query));
  }, [allItems, query]);

  const runItem = useCallback(
    (item: CommandItem) => {
      setOpen(false);
      setQuery("");
      if (item.href) {
        router.push(item.href);
      }
    },
    [router]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) runItem(filtered[activeIndex]);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setQuery("");
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="gap-0 p-0 sm:max-w-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            placeholder="جستجو..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-11 border-0 bg-transparent focus-visible:ring-0"
            dir="rtl"
          />
        </div>

        <div
          ref={listRef}
          className="max-h-72 overflow-y-auto overscroll-contain p-1"
          role="listbox"
        >
          {filtered.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              نتیجه‌ای یافت نشد
            </div>
          )}
          {filtered.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.href ?? item.title}
                role="option"
                aria-selected={i === activeIndex}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none transition-colors",
                  i === activeIndex
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground"
                )}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => runItem(item)}
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-right">{item.title}</span>
                {item.kind === "nav" && item.sectionTitle && (
                  <span className="text-xs text-muted-foreground">
                    {item.sectionTitle}
                  </span>
                )}
                {i === activeIndex && (
                  <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
            ناوبری
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">↵</kbd>
            انتخاب
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Esc</kbd>
            بستن
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
