"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays } from "lucide-react";

const RANGES = [
  { value: "today", label: "امروز" },
  { value: "week", label: "این هفته" },
  { value: "month", label: "این ماه" },
  { value: "quarter", label: "این فصل" },
  { value: "year", label: "امسال" },
  { value: "all", label: "همه" },
] as const;

export type DateRangeValue = (typeof RANGES)[number]["value"];

export function DateRangeFilter({ defaultValue = "month" }: { defaultValue?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("range") || defaultValue;

  const handleChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === defaultValue) {
        params.delete("range");
      } else {
        params.set("range", value);
      }
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, defaultValue],
  );

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger className="w-[160px] gap-2">
        <CalendarDays className="size-4 text-muted-foreground" />
        <SelectValue placeholder="بازه زمانی" />
      </SelectTrigger>
      <SelectContent>
        {RANGES.map((r) => (
          <SelectItem key={r.value} value={r.value}>
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
