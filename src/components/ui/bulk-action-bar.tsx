"use client";

import { Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toFaDigits } from "@/lib/format";

type Props = {
  count: number;
  onClear: () => void;
  onDelete?: () => void;
  deleting?: boolean;
  label?: string;
};

export function BulkActionBar({
  count,
  onClear,
  onDelete,
  deleting,
  label = "آیتم",
}: Props) {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border bg-background px-4 py-3 shadow-lg">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">
          {toFaDigits(count)} {label} انتخاب شده
        </span>
        <div className="flex items-center gap-2">
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              حذف
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClear}>
            <X className="size-4" />
            انصراف
          </Button>
        </div>
      </div>
    </div>
  );
}
