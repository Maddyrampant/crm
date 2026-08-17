"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createQuoteAction } from "@/actions/quotes";

type QuoteItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

export function QuoteForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [contactId, setContactId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuoteItemInput[]>([
    { description: "", quantity: 1, unitPrice: 0, taxRate: 0 },
  ]);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unitPrice: 0, taxRate: 0 },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof QuoteItemInput, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const totalTax = items.reduce(
    (sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate) / 100,
    0,
  );
  const total = subtotal + totalTax + (subtotal * taxRate) / 100;

  async function handleSubmit() {
    if (items.length === 0 || items.every((i) => !i.description.trim())) {
      toast.error("حداقل یک ردیف با توضیحات وارد کنید");
      return;
    }
    setSaving(true);
    const res = await createQuoteAction({
      contactId: contactId || "00000000-0000-0000-0000-000000000000",
      validUntil: validUntil || null,
      taxRate,
      notes: notes || null,
      items: items
        .filter((i) => i.description.trim())
        .map((i) => ({
          description: i.description.trim(),
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          taxRate: i.taxRate,
        })),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("پیشنهاد فروش ساخته شد");
      router.push(`/quotes/${res.data.id}`);
    } else {
      toast.error("خطا در ساخت پیشنهاد");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">پیشنهاد فروش جدید</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>شناسه مشتری (اختیاری)</Label>
            <Input
              placeholder="UUID مشتری"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              dir="ltr"
            />
          </div>
          <div className="grid gap-2">
            <Label>تاریخ اعتبار</Label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>مالیات کل (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>ردیف‌ها</Label>
            <Button size="sm" variant="outline" onClick={addItem}>
              <Plus className="size-4" />
              افزودن ردیف
            </Button>
          </div>
          {items.map((item, idx) => (
            <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_80px_120px_80px_40px]">
              <Input
                placeholder="توضیحات"
                value={item.description}
                onChange={(e) => updateItem(idx, "description", e.target.value)}
              />
              <Input
                type="number"
                min={0}
                placeholder="تعداد"
                value={item.quantity}
                onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
              />
              <Input
                type="number"
                min={0}
                placeholder="قیمت واحد"
                value={item.unitPrice}
                onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))}
              />
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="مالیات %"
                value={item.taxRate}
                onChange={(e) => updateItem(idx, "taxRate", Number(e.target.value))}
              />
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => removeItem(idx)}
                disabled={items.length <= 1}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="grid gap-2">
          <Label>یادداشت</Label>
          <Textarea
            rows={3}
            placeholder="یادداشت اختیاری..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="rounded-lg border p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">جمع فرعی:</span>
            <span className="font-medium tabular-nums">
              {subtotal.toLocaleString("fa-IR")} تومان
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">مالیات:</span>
            <span className="tabular-nums">
              {totalTax.toLocaleString("fa-IR")} تومان
            </span>
          </div>
          <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold">
            <span>جمع کل:</span>
            <span className="tabular-nums">
              {total.toLocaleString("fa-IR")} تومان
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            انصراف
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            <Save className="size-4" />
            ذخیره پیشنهاد
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
