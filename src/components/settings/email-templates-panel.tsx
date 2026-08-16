"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  createEmailTemplateAction,
  deleteEmailTemplateAction,
  updateEmailTemplateAction,
} from "@/actions/automation";
import type { EmailTemplate } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SAMPLE_VARS = [
  "contact.name",
  "contact.company",
  "invoice.number",
  "invoice.total",
  "workspace.name",
];

type FormState = {
  id?: string;
  name: string;
  subject: string;
  body: string;
};

const emptyForm: FormState = { name: "", subject: "", body: "" };

export function EmailTemplatesPanel({ templates }: { templates: EmailTemplate[] }) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit(t: EmailTemplate) {
    setEditingId(t.id);
    setForm({ id: t.id, name: t.name, subject: t.subject, body: t.body });
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function insertVar(v: string) {
    setForm((f) => ({ ...f, body: f.body + ` {{${v}}}` }));
  }

  async function save() {
    setSaving(true);
    const res = editingId
      ? await updateEmailTemplateAction(editingId, form)
      : await createEmailTemplateAction(form);
    setSaving(false);
    if (res.ok) {
      toast.success(editingId ? "الگو به‌روزرسانی شد" : "الگو ساخته شد");
      reset();
      window.location.reload();
    } else {
      toast.error("خطا در ذخیره الگو");
    }
  }

  async function remove(t: EmailTemplate) {
    if (!confirm("این الگو حذف شود؟")) return;
    const res = await deleteEmailTemplateAction(t.id);
    if (res.ok) {
      toast.success("الگو حذف شد");
      window.location.reload();
    } else {
      toast.error("خطا در حذف الگو");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">الگوهای ایمیل</CardTitle>
          <CardDescription>
            الگوها با متغیرهای {`{{contact.name}}`} و... هنگام ارسال پر می‌شوند
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {templates.length === 0 && (
            <p className="text-sm text-muted-foreground">هنوز الگویی ثبت نشده است</p>
          )}
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="font-medium">{t.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t.subject}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => startEdit(t)}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => remove(t)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            {editingId ? "ویرایش الگو" : "الگوی جدید"}
          </CardTitle>
          {editingId && (
            <Button size="sm" variant="ghost" onClick={reset}>
              <X className="size-4" />
              انصراف
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>نام الگو</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="مثلاً پیام خوش‌آمد"
            />
          </div>
          <div className="grid gap-2">
            <Label>موضوع</Label>
            <Input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="خوش آمدید {{contact.name}}"
            />
          </div>
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-1">
              <Label>متن</Label>
              <span className="text-xs text-muted-foreground">— متغیرها:</span>
              {SAMPLE_VARS.map((v) => (
                <Button
                  key={v}
                  size="sm"
                  variant="outline"
                  className="h-6 px-1.5 font-mono text-[10px]"
                  onClick={() => insertVar(v)}
                >
                  <Plus className="size-3" />
                  {v}
                </Button>
              ))}
            </div>
            <Textarea
              rows={8}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder={"سلام {{contact.name}}،\nفاکتور {{invoice.number}} شما صادر شد."}
            />
          </div>
          <Button
            onClick={save}
            disabled={saving || !form.name || !form.subject || !form.body}
          >
            {saving ? "در حال ذخیره…" : editingId ? "ذخیره تغییرات" : "ساخت الگو"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
