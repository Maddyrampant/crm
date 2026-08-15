"use client";

import { usePathname } from "next/navigation";
import { allNavItems } from "@/config/nav";

export function PageTitle() {
  const pathname = usePathname();

  const matches = allNavItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length);
  const current = matches[0] ?? allNavItems.find((i) => i.href === "/");

  if (!current) return null;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:block">
        {current.sectionTitle} /
      </span>
      <span className="truncate text-sm font-semibold">{current.title}</span>
    </div>
  );
}
