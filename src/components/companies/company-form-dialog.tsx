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
import { createCompanyAction, updateCompanyAction } from "@/actions/contacts";
import type { CompanyRow } from "@/lib/api-types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: CompanyRow | null;
  onSaved: (company: CompanyRow) => void;
};

type FormState = {
  name: string;
  domain: string;
  industry: string;
  website: string;
  address: string;
  notes: string;
};

export function CompanyFormDialog({ open, onOpenChange, company, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: company?.name ?? "",
    domain: company?.domain ?? "",
    industry: company?.industry ?? "",
    website: company?.website ?? "",
    address: company?.address ?? "",
    notes: company?.notes ?? "",
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name,
      domain: form.domain || null,
      industry: form.industry || null,
      website: form.website || null,
      address: form.address || null,
      notes: form.notes || null,
    };

    const result = company
      ? await updateCompanyAction(company.id, payload)
      : await createCompanyAction(payload);

    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(company ? "شرکت ویرایش شد" : "شرکت جدید ساخته شد");
    onSaved(result.data as CompanyRow);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{company ? "ویرایش شرکت" : "شرکت جدید"}</DialogTitle>
          <DialogDescription>اطلاعات شرکت را وارد کنید.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">نام شرکت *</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="domain">دامنه</Label>
              <Input
                id="domain"
                dir="ltr"
                placeholder="example.com"
                value={form.domain}
                onChange={(e) => set("domain", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="industry">صنعت</Label>
              <Input
                id="industry"
                value={form.industry}
                onChange={(e) => set("industry", e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="website">وب‌سایت</Label>
            <Input
              id="website"
              dir="ltr"
              placeholder="https://..."
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">آدرس</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
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
              {company ? "ذخیره تغییرات" : "ایجاد شرکت"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
