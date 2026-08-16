"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createInvoiceAction } from "@/actions/invoices";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Customer = { id: string; name: string; email: string | null };

type ItemRow = {
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
};

const emptyItem: ItemRow = {
  description: "",
  quantity: "1",
  unitPrice: "0",
  taxRate: "0",
};

const num = (v: string) => Number(v) || 0;

export function InvoiceForm({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [contactId, setContactId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ ...emptyItem }]);

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
    );
  }

  const subtotal = items.reduce(
    (acc, it) => acc + num(it.quantity) * num(it.unitPrice),
    0
  );
  const tax = items.reduce(
    (acc, it) => acc + (num(it.quantity) * num(it.unitPrice) * num(it.taxRate)) / 100,
    0
  );
  const total = subtotal + tax - num(discount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactId) {
      toast.error("مشتری را انتخاب کنید");
      return;
    }
    if (items.some((it) => !it.description.trim())) {
      toast.error("شرح همه آیتم‌ها را وارد کنید");
      return;
    }
    setLoading(true);
    const result = await createInvoiceAction({
      contactId,
      dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      discount: num(discount),
      taxRate: 0,
      notes,
      items: items.map((it) => ({
        description: it.description.trim(),
        quantity: num(it.quantity),
        unitPrice: num(it.unitPrice),
        taxRate: num(it.taxRate),
      })),
    });
    setLoading(false);
    if (result.ok) {
      toast.success("فاکتور ساخته شد");
      router.push(`/invoices/${result.id}`);
      router.refresh();
    } else {
      toast.error("خطا در ساخت فاکتور");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">فاکتور جدید</h1>
          <p className="text-muted-foreground">
            ساخت فاکتور با یک یا چند آیتم
          </p>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "در حال ساخت…" : "ساخت فاکتور"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">اطلاعات مشتری</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>مشتری *</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger>
                <SelectValue placeholder="انتخاب مشتری" />
              </SelectTrigger>
              <SelectContent>
                {customers.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground">
                    هنوز مخاطبی ثبت نشده است
                  </div>
                )}
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.email ? ` (${c.email})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>سررسید</Label>
            <Input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">آیتم‌ها</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItems((prev) => [...prev, { ...emptyItem }])}
          >
            <Plus />
            افزودن آیتم
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((it, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_80px_110px_80px_36px]"
            >
              <Input
                placeholder="شرح خدمت یا کالا"
                value={it.description}
                onChange={(e) =>
                  updateItem(index, { description: e.target.value })
                }
              />
              <Input
                type="number"
                min="0"
                placeholder="تعداد"
                value={it.quantity}
                onChange={(e) => updateItem(index, { quantity: e.target.value })}
              />
              <Input
                type="number"
                min="0"
                placeholder="قیمت واحد"
                value={it.unitPrice}
                onChange={(e) =>
                  updateItem(index, { unitPrice: e.target.value })
                }
              />
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="درصد مالیات"
                value={it.taxRate}
                onChange={(e) => updateItem(index, { taxRate: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="self-end text-destructive"
                disabled={items.length === 1}
                onClick={() =>
                  setItems((prev) => prev.filter((_, i) => i !== index))
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">خلاصه و یادداشت</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>تخفیف (تومان)</Label>
            <Input
              type="number"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>یادداشت</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
        <CardContent className="grid gap-1 border-t pt-4 sm:grid-cols-3">
          <div className="text-sm text-muted-foreground">
            جمع اقلام: <b className="text-foreground">{formatCurrency(subtotal)}</b>
          </div>
          <div className="text-sm text-muted-foreground">
            مالیات: <b className="text-foreground">{formatCurrency(tax)}</b>
          </div>
          <div className="text-sm font-bold">
            مبلغ کل: {formatCurrency(Math.max(0, total))}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
