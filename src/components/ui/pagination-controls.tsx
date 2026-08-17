"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { formatNumber } from "@/lib/format";

type Props = {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
};

export function PaginationControls({
  page,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className ?? ""}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">تعداد در صفحه:</span>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => onPageSizeChange(Number(v))}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {formatNumber(size)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>
          {formatNumber(from)}–{formatNumber(to)} از {formatNumber(total)}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-xs"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
        <span className="min-w-[4rem] px-2 text-center text-sm">
          {formatNumber(page)} / {formatNumber(totalPages)}
        </span>
        <Button
          variant="outline"
          size="icon-xs"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
      </div>
    </div>
  );
}
