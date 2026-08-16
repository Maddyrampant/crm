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
import { createSupplierAction, updateSupplierAction } from "@/actions/inventory";
import type { Supplier } from "@/db/schema";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  onSaved: () => void;
};

type FormState = {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

export function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>(() => ({
    name: supplier?.name ?? "",
    contactName: supplier?.contactName ?? "",
    phone: supplier?.phone ?? "",
    email: supplier?.email ?? "",
    address: supplier?.address ?? "",
    notes: supplier?.notes ?? "",
  }));

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload: FormState = {
      name: form.name,
      contactName: form.contactName,
      phone: form.phone,
      email: form.email,
      address: form.address,
      notes: form.notes,
    };

    try {
      if (supplier) await updateSupplierAction(supplier.id, payload);
      else await createSupplierAction(payload);

      toast.success(
        supplier ? "تأمین‌کننده ویرایش شد" : "تأمین‌کننده جدید ساخته شد"
      );
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ثبت تأمین‌کننده");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {supplier ? "ویرایش تأمین‌کننده" : "تأمین‌کننده جدید"}
          </DialogTitle>
          <DialogDescription>
            اطلاعات تماس تأمین‌کننده را وارد کنید.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="supplierName">نام تأمین‌کننده *</Label>
            <Input
              id="supplierName"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="contactName">شخص تماس</Label>
              <Input
                id="contactName"
                value={form.contactName}
                onChange={(e) => set("contactName", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supplierPhone">موبایل</Label>
              <Input
                id="supplierPhone"
                dir="ltr"
                className="text-end"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="supplierEmail">ایمیل</Label>
            <Input
              id="supplierEmail"
              dir="ltr"
              type="email"
              className="text-end"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="supplierAddress">آدرس</Label>
            <Input
              id="supplierAddress"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="supplierNotes">یادداشت</Label>
            <Textarea
              id="supplierNotes"
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
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
              {supplier ? "ذخیره تغییرات" : "ساخت تأمین‌کننده"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
