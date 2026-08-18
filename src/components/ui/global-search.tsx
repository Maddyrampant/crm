"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, User, Building2, Handshake, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { globalSearchAction } from "@/actions/search";
import type { GlobalSearchResult } from "@/actions/search";

type FlatResult = {
  type: "contact" | "company" | "deal";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

const TYPE_ICONS: Record<FlatResult["type"], typeof Search> = {
  contact: User,
  company: Building2,
  deal: Handshake,
};

const TYPE_LABELS: Record<FlatResult["type"], string> = {
  contact: "مشتری",
  company: "شرکت",
  deal: "فروش",
};

function flattenResults(data: GlobalSearchResult): FlatResult[] {
  const results: FlatResult[] = [];
  data.contacts.forEach((c) =>
    results.push({
      type: "contact",
      id: c.id,
      title: `${c.firstName} ${c.lastName || ""}`.trim(),
      subtitle: c.email || "",
      href: `/contacts/${c.id}`,
    })
  );
  data.companies.forEach((c) =>
    results.push({
      type: "company",
      id: c.id,
      title: c.name,
      subtitle: c.industry || "",
      href: `/companies/${c.id}`,
    })
  );
  data.deals.forEach((d) =>
    results.push({
      type: "deal",
      id: d.id,
      title: d.title,
      subtitle: d.contactName || "",
      href: `/pipeline`,
    })
  );
  return results;
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FlatResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await globalSearchAction({ query: q });
      if (res.ok && res.data) {
        setResults(flattenResults(res.data));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    timerRef.current = setTimeout(() => {
      doSearch(q);
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, doSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  function handleSelect(href: string) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(href);
  }

  const grouped = results.reduce(
    (acc, r) => {
      if (!acc[r.type]) acc[r.type] = [];
      acc[r.type].push(r);
      return acc;
    },
    {} as Record<string, FlatResult[]>
  );

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          dir="rtl"
          className="ps-8 w-64"
          placeholder="جستجو..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </div>
      {open && query.trim().length > 0 && (
        <div className="absolute top-full z-50 mt-1 w-full min-w-[320px] overflow-hidden rounded-lg border bg-popover shadow-md">
          {loading && results.length === 0 ? (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              در حال جستجو...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              نتیجه‌ای یافت نشد
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto p-1">
              {Object.entries(grouped).map(([type, items]) => {
                const Icon = TYPE_ICONS[type as FlatResult["type"]];
                return (
                  <div key={type}>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      {TYPE_LABELS[type as FlatResult["type"]]}
                    </div>
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start hover:bg-accent"
                        onClick={() => handleSelect(item.href)}
                      >
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {item.title}
                          </span>
                          {item.subtitle && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
