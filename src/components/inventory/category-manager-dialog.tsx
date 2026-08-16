"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  createProductCategoryAction,
  deleteProductCategoryAction,
} from "@/actions/inventory";
import { formatNumber } from "@/lib/format";
import type { CategoryWithCount } from "@/lib/inventory";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryWithCount[];
  onChanged: () => void;
};

export function CategoryManagerDialog({
  open,
  onOpenChange,
  categories,
  onChanged,
}: Props) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    setBusy(true);
    try {
      await createProductCategoryAction(clean);
      setName("");
      toast.success("دسته‌بندی ساخته شد");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ساخت دسته‌بندی");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(categoryId: string, categoryName: string) {
    setBusy(true);
    try {
      await deleteProductCategoryAction(categoryId);
      toast.success(`«${categoryName}» حذف شد`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در حذف دسته‌بندی");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>دسته‌بندی کالاها</DialogTitle>
          <DialogDescription>
            دسته‌بندی‌ها را بسازید یا حذف کنید. حذف دسته‌بندی، کالاهای آن را
            بدون دسته‌بندی می‌کند.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <form onSubmit={handleCreate} className="flex items-center gap-2">
            <Input
              dir="rtl"
              placeholder="نام دسته‌بندی جدید..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
            <Button type="submit" size="sm" disabled={busy || !name.trim()}>
              <Plus className="size-4" />
              افزودن
            </Button>
          </form>

          <div className="grid max-h-64 gap-1.5 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                هنوز دسته‌بندی‌ای نساخته‌اید.
              </p>
            ) : (
              categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-lg border p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {formatNumber(c.productCount)} کالا
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={busy}
                    onClick={() => handleDelete(c.id, c.name)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            بستن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
