"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createQuoteAction } from "@/actions/quotes";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { JalaliDateInput } from "@/components/ui/jalali-date-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Contact = { id: string; name: string };

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

export function QuoteForm({
  contacts,
  open,
  onOpenChange,
}: {
  contacts: Contact[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [contactId, setContactId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [taxRate, setTaxRate] = useState("0");
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
  const itemsTax = items.reduce(
    (acc, it) =>
      acc + (num(it.quantity) * num(it.unitPrice) * num(it.taxRate)) / 100,
    0
  );
  const globalTax = (subtotal * num(taxRate)) / 100;
  const total = subtotal + itemsTax + globalTax;

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
    const result = await createQuoteAction({
      contactId,
      validUntil: validUntil || undefined,
      taxRate: num(taxRate),
      notes: notes || undefined,
      items: items.map((it) => ({
        description: it.description.trim(),
        quantity: num(it.quantity),
        unitPrice: num(it.unitPrice),
        taxRate: num(it.taxRate),
      })),
    });
    setLoading(false);
    if (result.ok) {
      toast.success("پیشنهاد ساخته شد");
      onOpenChange(false);
      setContactId("");
      setValidUntil("");
      setTaxRate("0");
      setNotes("");
      setItems([{ ...emptyItem }]);
      router.refresh();
    } else {
      toast.error("خطا در ساخت پیشنهاد");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>پیشنهاد فروش جدید</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 px-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>مشتری *</Label>
                <Select value={contactId} onValueChange={setContactId}>
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب مشتری" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.length === 0 && (
                      <div className="p-2 text-sm text-muted-foreground">
                        هنوز مخاطبی ثبت نشده است
                      </div>
                    )}
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>سررسید</Label>
                <JalaliDateInput
                  value={validUntil}
                  onChange={(v) => setValidUntil(v ?? "")}
                  id="validUntil"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>درصد مالیات کلی</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>یادداشت</Label>
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>آیتم‌ها</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setItems((prev) => [...prev, { ...emptyItem }])}
                >
                  <Plus className="size-4" />
                  افزودن
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((it, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-lg border p-2 sm:grid-cols-[minmax(0,1fr)_70px_90px_70px_32px]"
                  >
                    <Input
                      placeholder="شرح"
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
                      onChange={(e) =>
                        updateItem(index, { quantity: e.target.value })
                      }
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
                      placeholder="مالیات٪"
                      value={it.taxRate}
                      onChange={(e) =>
                        updateItem(index, { taxRate: e.target.value })
                      }
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
              </div>
            </div>

            <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">جمع اقلام</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">مالیات آیتم‌ها</span>
                <span>{formatCurrency(itemsTax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">مالیات کلی</span>
                <span>{formatCurrency(globalTax)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-bold">
                <span>مبلغ کل</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </form>
        </div>

        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              "ساخت پیشنهاد"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
