"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createCampaignTemplateAction } from "@/actions/email-campaign";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function TemplateFormDialog({ open, onOpenChange, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");

  function reset() {
    setName("");
    setSubject("");
    setHtmlBody("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const result = await createCampaignTemplateAction({
      name,
      subject,
      htmlBody,
    });

    setSaving(false);

    if (!result.ok || !result.data) {
      toast.error("خطا در ایجاد قالب");
      return;
    }

    toast.success("قالب جدید ایجاد شد");
    reset();
    onSaved();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>قالب ایمیلی جدید</DialogTitle>
          <DialogDescription>
            یک قالب ایمیلی جدید برای استفاده در کمپین‌ها بسازید.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-4">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tpl-name">نام قالب *</Label>
              <Input
                id="tpl-name"
                dir="rtl"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً خوشامدگویی"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tpl-subject">موضوع ایمیل *</Label>
              <Input
                id="tpl-subject"
                dir="rtl"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="موضوع ایمیل..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tpl-body">محتوای ایمیل *</Label>
              <Textarea
                id="tpl-body"
                dir="rtl"
                rows={8}
                required
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                placeholder="محتوای HTML ایمیل..."
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
            ایجاد قالب
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
