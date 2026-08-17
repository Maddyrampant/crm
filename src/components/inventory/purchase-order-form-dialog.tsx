"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Package, Plus, Trash2 } from "lucide-react";
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
import { JalaliDateTimeInput } from "@/components/ui/jalali-date-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPurchaseOrderAction } from "@/actions/inventory";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { Supplier } from "@/db/schema";
import type { ProductWithStock } from "@/lib/inventory";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  products: ProductWithStock[];
  onSaved: () => void;
};

type ItemRow = {
  productId: string;
  quantity: string;
  unitPrice: string;
};

const emptyItem: ItemRow = {
  productId: "",
  quantity: "1",
  unitPrice: "",
};

function ProductPicker({
  products,
  item,
  onPick,
}: {
  products: ProductWithStock[];
  item: ItemRow;
  onPick: (patch: Partial<ItemRow>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const q = query.trim().toLowerCase();
  const matches = q
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.sku ?? "").toLowerCase().includes(q) ||
            (p.barcode ?? "").toLowerCase().includes(q)
        )
        .slice(0, 12)
    : products.slice(0, 8);

  const selected = products.find((p) => p.id === item.productId);

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Package className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          dir="rtl"
          className="ps-8"
          placeholder="کالا را جستجو کنید…"
          value={selected ? selected.name : query}
          onChange={(e) => {
            setQuery(e.target.value);
            onPick({ productId: "", unitPrice: "" });
          }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && matches.length > 0 && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
          <ul className="max-h-64 overflow-y-auto p-1">
            {matches.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-start hover:bg-accent"
                  onClick={() => {
                    onPick({ productId: p.id, unitPrice: String(p.unitPrice) });
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {p.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground" dir="ltr">
                      {p.sku || "—"} • {p.unit}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatCurrency(p.unitPrice)} • موجودی {formatNumber(p.totalStock)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function PurchaseOrderFormDialog({
  open,
  onOpenChange,
  suppliers,
  products,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([emptyItem]);

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((rows) =>
      rows.map((r, i) => (i === index ? { ...r, ...patch } : r))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const filled = items.filter((r) => r.productId);
    if (filled.length === 0) {
      toast.error("حداقل یک کالا انتخاب کنید");
      return;
    }
    if (filled.some((r) => Number(r.quantity) <= 0)) {
      toast.error("تعداد هر آیتم باید بزرگ‌تر از صفر باشد");
      return;
    }

    setSaving(true);
    const payload = {
      supplierId: supplierId || null,
      expectedAt: expectedAt ? new Date(expectedAt).toISOString() : null,
      notes: notes,
      items: filled.map((r) => ({
        productId: r.productId,
        quantity: Number(r.quantity),
        unitPrice: Number(r.unitPrice) || 0,
      })),
    };

    try {
      await createPurchaseOrderAction(payload);
      toast.success("سفارش خرید ساخته شد");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ثبت سفارش");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setSupplierId("");
          setExpectedAt("");
          setNotes("");
          setItems([emptyItem]);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>سفارش خرید جدید</DialogTitle>
          <DialogDescription>
            تأمین‌کننده، اقلام و قیمت‌های خرید را وارد کنید.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>تأمین‌کننده</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="بدون تأمین‌کننده" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-supplier">بدون تأمین‌کننده</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expectedAt">تاریخ دریافت مورد انتظار</Label>
              <JalaliDateTimeInput value={expectedAt} onChange={(v) => setExpectedAt(v ?? "")} id="expectedAt" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>اقلام</Label>
            <div className="grid gap-2">
              {items.map((row, index) => {
                return (
                  <div
                    key={index}
                    className="grid grid-cols-2 sm:grid-cols-[1fr_5rem_7rem_auto] items-start gap-2 rounded-lg border p-2"
                  >
                    <div className="min-w-0">
                      <ProductPicker
                        products={products}
                        item={row}
                        onPick={(patch) => updateItem(index, patch)}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">تعداد</Label>
                      <Input
                        dir="ltr"
                        type="number"
                        min="0"
                        step="any"
                        className="h-9 text-end"
                        value={row.quantity}
                        onChange={(e) =>
                          updateItem(index, { quantity: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">قیمت واحد (تومان)</Label>
                      <Input
                        dir="ltr"
                        type="number"
                        min="0"
                        step="any"
                        className="h-9 text-end"
                        value={row.unitPrice}
                        onChange={(e) =>
                          updateItem(index, { unitPrice: e.target.value })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="mt-4"
                      disabled={items.length <= 1}
                      onClick={() =>
                        setItems((rows) => rows.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setItems((rows) => [...rows, emptyItem])}
            >
              <Plus className="size-4" />
              افزودن ردیف
            </Button>
            <p className="text-xs text-muted-foreground">
              موجودی هر کالا در انتخاب نمایش داده می‌شود؛ قیمت واحد خودکار پر
              می‌شود و قابل ویرایش است.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="poNotes">یادداشت</Label>
            <Textarea
              id="poNotes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              انصراف
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              ثبت سفارش
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
