"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";

type FilterValues = Record<string, string>;

export function useUrlFilters(defaults: FilterValues) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(() => {
    const result: FilterValues = {};
    for (const [key, defaultValue] of Object.entries(defaults)) {
      result[key] = searchParams.get(key) ?? defaultValue;
    }
    return result;
  }, [searchParams, defaults]);

  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== defaults[key]) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname, defaults]
  );

  const setFilters = useCallback(
    (updates: FilterValues) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value && value !== defaults[key]) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname, defaults]
  );

  const page = Number(searchParams.get("page") ?? "1");
  const setPage = useCallback(
    (p: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (p > 1) params.set("page", String(p));
      else params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  return { filters, setFilter, setFilters, page, setPage };
}
