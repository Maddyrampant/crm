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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProductAction, updateProductAction } from "@/actions/inventory";
import { PRODUCT_UNITS } from "@/lib/inventory";
import { formatCurrency } from "@/lib/format";
import type { CategoryWithCount, ProductWithStock } from "@/lib/inventory";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductWithStock | null;
  categories: CategoryWithCount[];
  onSaved: () => void;
};

type FormState = {
  name: string;
  sku: string;
  categoryId: string;
  unit: string;
  unitPrice: string;
  costPrice: string;
  taxable: boolean;
  active: boolean;
  barcode: string;
  notes: string;
};

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>(() => ({
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    categoryId: product?.categoryId ?? "",
    unit: product?.unit ?? "عدد",
    unitPrice: product ? String(product.unitPrice ?? "") : "",
    costPrice: product ? String(product.costPrice ?? "") : "",
    taxable: product?.taxable ?? true,
    active: product?.active ?? true,
    barcode: product?.barcode ?? "",
    notes: product?.notes ?? "",
  }));

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name,
      sku: form.sku,
      categoryId:
        form.categoryId && form.categoryId !== "no-category"
          ? form.categoryId
          : null,
      unit: form.unit,
      unitPrice: Number(form.unitPrice) || 0,
      costPrice: Number(form.costPrice) || 0,
      taxable: form.taxable,
      active: form.active,
      barcode: form.barcode || null,
      notes: form.notes,
    };

    try {
      if (product) await updateProductAction(product.id, payload);
      else await createProductAction(payload);

      toast.success(product ? "کالا ویرایش شد" : "کالای جدید ساخته شد");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ثبت کالا");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? "ویرایش کالا" : "کالای جدید"}</DialogTitle>
          <DialogDescription>
            مشخصات کالا را وارد کنید.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="productName">نام کالا *</Label>
            <Input
              id="productName"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="sku">کد کالا (SKU) *</Label>
              <Input
                id="sku"
                dir="ltr"
                required
                className="text-end"
                value={form.sku}
                onChange={(e) => set("sku", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="barcode">بارکد</Label>
              <Input
                id="barcode"
                dir="ltr"
                className="text-end"
                value={form.barcode}
                onChange={(e) => set("barcode", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>دسته‌بندی</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => set("categoryId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="بدون دسته‌بندی" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-category">بدون دسته‌بندی</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>واحد</Label>
              <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="unitPrice">قیمت فروش (تومان)</Label>
              <Input
                id="unitPrice"
                dir="ltr"
                type="number"
                step="any"
                min="0"
                className="text-end"
                value={form.unitPrice}
                onChange={(e) => set("unitPrice", e.target.value)}
              />
              {form.unitPrice && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(Number(form.unitPrice))}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="costPrice">قیمت خرید (تومان)</Label>
              <Input
                id="costPrice"
                dir="ltr"
                type="number"
                step="any"
                min="0"
                className="text-end"
                value={form.costPrice}
                onChange={(e) => set("costPrice", e.target.value)}
              />
              {form.costPrice && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(Number(form.costPrice))}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">یادداشت</Label>
            <Textarea
              id="notes"
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.active}
                onCheckedChange={(v) => set("active", v === true)}
              />
              کالا فعال است
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.taxable}
                onCheckedChange={(v) => set("taxable", v === true)}
              />
              مشمول مالیات است
            </label>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              انصراف
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {product ? "ذخیره تغییرات" : "ساخت کالا"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
