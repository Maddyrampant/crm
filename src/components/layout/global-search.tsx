"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Kanban, Loader2, Search, Users } from "lucide-react";
import { globalSearchAction } from "@/actions/search";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { CompanyRow, ContactRow, DealRow } from "@/lib/api-types";

type Results = {
  contacts: ContactRow[];
  companies: CompanyRow[];
  deals: DealRow[];
};

type SearchItem = {
  kind: "contact" | "company" | "deal";
  id: string;
  href: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef("");

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    latestQueryRef.current = query.trim();
  }, [query]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = query.trim();
    if (!q) return;
    timerRef.current = setTimeout(() => {
      setLoading(true);
      setOpen(true);
      void globalSearchAction({ query: q }).then((result) => {
        if (latestQueryRef.current !== q) return;
        if (result.ok && result.data) {
          setResults(result.data);
          setActiveIndex(-1);
        } else {
          setResults(null);
        }
        setLoading(false);
      });
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const groups: { label: string; seeAllHref: string; items: SearchItem[] }[] =
    results
      ? [
          {
            label: "مشتریان",
            seeAllHref: `/contacts?search=${encodeURIComponent(query.trim())}`,
            items: results.contacts.map((c) => ({
              kind: "contact",
              id: c.id,
              href: `/contacts/${c.id}`,
              title: `${c.firstName} ${c.lastName ?? ""}`.trim(),
              subtitle: c.companyName ?? c.email ?? "",
              icon: Users,
            })),
          },
          {
            label: "شرکت‌ها",
            seeAllHref: `/companies?search=${encodeURIComponent(query.trim())}`,
            items: results.companies.map((c) => ({
              kind: "company",
              id: c.id,
              href: `/companies/${c.id}`,
              title: c.name,
              subtitle: c.industry ?? c.domain ?? "",
              icon: Building2,
            })),
          },
          {
            label: "فروش‌ها",
            seeAllHref: `/pipeline`,
            items: results.deals.map((d) => ({
              kind: "deal",
              id: d.id,
              href: `/pipeline`,
              title: d.title,
              subtitle: d.contactName ?? d.companyName ?? "",
              icon: Kanban,
            })),
          },
        ]
      : [];

  const flatItems = groups.flatMap((g) => g.items);
  const totalCount = flatItems.length;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      const target = flatItems[activeIndex];
      if (target) {
        setOpen(false);
        setQuery("");
        router.push(target.href);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        dir="rtl"
        value={query}
        onChange={(e) => {
          const q = e.target.value;
          setQuery(q);
          if (!q.trim()) {
            setResults(null);
            setLoading(false);
            setOpen(false);
          }
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => query.trim() && setOpen(true)}
        placeholder="جستجوی مشتری، شرکت یا فروش..."
        className="pe-9 ps-9"
        aria-label="جستجوی سراسری"
      />
      {loading && (
        <Loader2 className="absolute end-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}

      {open && query.trim() && (
        <div className="absolute end-0 top-full z-50 mt-2 w-full overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
          {totalCount === 0 && !loading ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              نتیجه‌ای یافت نشد
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto p-1">
              {groups.map((group) =>
                group.items.length > 0 ? (
                  <div key={group.label} className="py-1">
                    <div className="flex items-center justify-between px-2 py-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {group.label}
                      </span>
                      <Link
                        href={group.seeAllHref}
                        onClick={() => {
                          setOpen(false);
                          setQuery("");
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        مشاهده همه
                      </Link>
                    </div>
                    {group.items.map((item) => (
                      <ResultLink
                        key={`${group.label}-${item.id}`}
                        href={item.href}
                        title={item.title}
                        subtitle={item.subtitle}
                        icon={item.icon}
                        active={flatItems.indexOf(item) === activeIndex}
                        onSelect={() => {
                          setOpen(false);
                          setQuery("");
                        }}
                      />
                    ))}
                  </div>
                ) : null
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultLink({
  href,
  title,
  subtitle,
  icon: Icon,
  active,
  onSelect,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
        active && "bg-accent"
      )}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">
        <span className="block truncate font-medium">{title}</span>
        {subtitle ? (
          <span className="block truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
