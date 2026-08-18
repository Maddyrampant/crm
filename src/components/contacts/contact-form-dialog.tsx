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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createContactAction, updateContactAction } from "@/actions/contacts";
import { SOURCE_OPTIONS, STAGE_OPTIONS } from "@/lib/labels";
import type { ContactRow, CustomFieldRow } from "@/lib/api-types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: ContactRow | null;
  companies: { id: string; name: string }[];
  members: { id: string; name: string; email: string }[];
  customFields: CustomFieldRow[];
  onSaved: (contact: ContactRow) => void;
};

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyId: string;
  source: string;
  lifecycleStage: string;
  ownerId: string;
  notes: string;
  customValues: Record<string, string>;
};

export function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  companies,
  members,
  customFields,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);

  const initialCustomValues: Record<string, string> = {};
  for (const f of customFields) {
    const v = contact?.customFields[f.key];
    initialCustomValues[f.key] = v === null || v === undefined ? "" : String(v);
  }

  const [form, setForm] = useState<FormState>(() => ({
    firstName: contact?.firstName ?? "",
    lastName: contact?.lastName ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    companyId: contact?.companyId ?? "",
    source: contact?.source ?? "other",
    lifecycleStage: contact?.lifecycleStage ?? "lead",
    ownerId: contact?.ownerId ?? "",
    notes: contact?.notes ?? "",
    customValues: initialCustomValues,
  }));

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const customFieldsValue: Record<string, unknown> = {};
    for (const f of customFields) {
      const v = form.customValues[f.key]?.trim();
      if (!v) continue;
      if (f.type === "number") customFieldsValue[f.key] = Number(v);
      else if (f.type === "date") customFieldsValue[f.key] = v;
      else customFieldsValue[f.key] = v;
    }

    const payload = {
      firstName: form.firstName,
      lastName: form.lastName || null,
      email: form.email || null,
      phone: form.phone || null,
      companyId: form.companyId || null,
      source: form.source,
      lifecycleStage: form.lifecycleStage,
      ownerId: form.ownerId || null,
      notes: form.notes || null,
      customFields: customFieldsValue,
    };

    const result = contact
      ? await updateContactAction(contact.id, payload)
      : await createContactAction(payload);

    setSaving(false);
    if (!result.ok || !result.data) {
      toast.error(result.error ?? "خطا در ثبت مشتری");
      return;
    }

    toast.success(contact ? "مشتری ویرایش شد" : "مشتری جدید ساخته شد");
    onSaved(result.data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{contact ? "ویرایش مشتری" : "مشتری جدید"}</DialogTitle>
          <DialogDescription>
            اطلاعات مشتری یا سرنخ را وارد کنید.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-4">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="firstName">نام *</Label>
                <Input
                  id="firstName"
                  required
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">نام خانوادگی</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="email">ایمیل</Label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">موبایل</Label>
                <Input
                  id="phone"
                  dir="ltr"
                  placeholder="0912xxxxxxx"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>شرکت</Label>
                <Select value={form.companyId || "none"} onValueChange={(v) => set("companyId", v === "none" ? "" : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="انتخاب شرکت" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون شرکت</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>مسئول فروش</Label>
                <Select value={form.ownerId || "none"} onValueChange={(v) => set("ownerId", v === "none" ? "" : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="انتخاب مسئول" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مسئول</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name || m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>منبع</Label>
                <Select value={form.source} onValueChange={(v) => set("source", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>مرحله</Label>
                <Select value={form.lifecycleStage} onValueChange={(v) => set("lifecycleStage", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {customFields.length > 0 && (
              <div className="grid gap-3 rounded-lg border p-3">
                <Label className="text-muted-foreground">فیلدهای سفارشی</Label>
                {customFields.map((f) => (
                  <div key={f.id} className="grid gap-1.5">
                    <Label htmlFor={`cf-${f.key}`} className="text-xs">
                      {f.name}
                    </Label>
                    {f.type === "select" ? (
                      <Select
                        value={form.customValues[f.key] || "none"}
                        onValueChange={(v) =>
                          set("customValues", { ...form.customValues, [f.key]: v === "none" ? "" : v })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="انتخاب کنید" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {f.options.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={`cf-${f.key}`}
                        type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                        dir={f.type === "number" || f.type === "date" ? "ltr" : undefined}
                        value={form.customValues[f.key] ?? ""}
                        onChange={(e) =>
                          set("customValues", { ...form.customValues, [f.key]: e.target.value })
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="notes">یادداشت</Label>
              <Textarea
                id="notes"
                rows={3}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </form>
        </div>

        <DialogFooter>
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
            {contact ? "ذخیره تغییرات" : "ایجاد مشتری"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
