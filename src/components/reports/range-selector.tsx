"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const options = [
  { value: "3", label: "۳ ماه اخیر" },
  { value: "6", label: "۶ ماه اخیر" },
  { value: "12", label: "۱۲ ماه اخیر" },
];

export function RangeSelector({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("months", v);
        router.replace(`${pathname}?${params.toString()}`);
      }}
    >
      <SelectTrigger className="w-44">
        <SelectValue placeholder="بازه زمانی" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
