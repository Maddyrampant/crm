"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { createCampaignAction } from "@/actions/email-campaign";

type Props = {
  templates: { id: string; name: string; subject: string; htmlBody: string }[];
};

export function CampaignForm({ templates }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    subject: "",
    htmlBody: "",
    plainBody: "",
    recipientType: "all",
  });

  function applyTemplate(templateId: string) {
    const t = templates.find((t) => t.id === templateId);
    if (t) {
      setForm((f) => ({
        ...f,
        subject: t.subject,
        htmlBody: t.htmlBody,
      }));
    }
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.subject.trim() || !form.htmlBody.trim()) {
      toast.error("فیلدهای ضروری را پر کنید");
      return;
    }
    setSaving(true);
    const res = await createCampaignAction({
      name: form.name.trim(),
      subject: form.subject.trim(),
      htmlBody: form.htmlBody.trim(),
      plainBody: form.plainBody.trim() || null,
      recipientType: form.recipientType,
    });
    setSaving(false);
    if (res.ok) {
      toast.success("کمپین ساخته شد");
      router.push("/email");
    } else {
      toast.error("خطا در ساخت کمپین");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">کمپین جدید</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {templates.length > 0 && (
          <div className="grid gap-2">
            <Label>استفاده از قالب</Label>
            <Select onValueChange={applyTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="انتخاب قالب (اختیاری)" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid gap-2">
          <Label>نام کمپین *</Label>
          <Input
            placeholder="مثلاً: خوشامدگویی مشتریان جدید"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="grid gap-2">
          <Label>موضوع ایمیل *</Label>
          <Input
            placeholder="موضوع ایمیل که در inbox نمایش داده می‌شود"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
        </div>

        <div className="grid gap-2">
          <Label>گیرندگان</Label>
          <Select
            value={form.recipientType}
            onValueChange={(v) => setForm({ ...form, recipientType: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه مخاطبین</SelectItem>
              <SelectItem value="selected">انتخاب شده</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>محتوای HTML *</Label>
          <Textarea
            rows={12}
            placeholder="<h1>سلام!</h1><p>محتوای ایمیل...</p>"
            value={form.htmlBody}
            onChange={(e) => setForm({ ...form, htmlBody: e.target.value })}
            className="font-mono text-sm"
            dir="ltr"
          />
        </div>

        <div className="grid gap-2">
          <Label>متن ساده (اختیاری)</Label>
          <Textarea
            rows={4}
            placeholder="متن ساده برای کلاینت‌هایی که HTML را پشتیبانی نمی‌کنند"
            value={form.plainBody}
            onChange={(e) => setForm({ ...form, plainBody: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            انصراف
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            <Save className="size-4" />
            ذخیره کمپین
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
