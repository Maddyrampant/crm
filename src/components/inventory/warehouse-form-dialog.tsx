"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createWarehouseAction, updateWarehouseAction } from "@/actions/inventory";
import type { WarehouseWithCount } from "@/lib/inventory";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: WarehouseWithCount | null;
  onSaved: () => void;
};

type FormState = {
  name: string;
  code: string;
  location: string;
  isDefault: boolean;
  active: boolean;
};

export function WarehouseFormDialog({
  open,
  onOpenChange,
  warehouse,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>(() => ({
    name: warehouse?.name ?? "",
    code: warehouse?.code ?? "",
    location: warehouse?.location ?? "",
    isDefault: warehouse?.isDefault ?? false,
    active: warehouse?.active ?? true,
  }));

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name,
      code: form.code,
      location: form.location,
      isDefault: form.isDefault,
      active: form.active,
    };

    try {
      if (warehouse) await updateWarehouseAction(warehouse.id, payload);
      else await createWarehouseAction(payload);

      toast.success(warehouse ? "انبار ویرایش شد" : "انبار جدید ساخته شد");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ثبت انبار");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{warehouse ? "ویرایش انبار" : "انبار جدید"}</DialogTitle>
          <DialogDescription>
            مشخصات انبار را وارد کنید.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="warehouseName">نام انبار *</Label>
            <Input
              id="warehouseName"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="warehouseCode">کد انبار</Label>
              <Input
                id="warehouseCode"
                dir="ltr"
                className="text-end"
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="warehouseLocation">موقعیت</Label>
              <Input
                id="warehouseLocation"
                dir="rtl"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.isDefault}
                onCheckedChange={(v) => set("isDefault", v === true)}
              />
              انبار پیش‌فرض
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.active}
                onCheckedChange={(v) => set("active", v === true)}
              />
              انبار فعال است
            </label>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              انصراف
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {warehouse ? "ذخیره تغییرات" : "ساخت انبار"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
