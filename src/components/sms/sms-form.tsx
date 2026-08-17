"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createSmsCampaignAction } from "@/actions/sms";
import { toFaDigits } from "@/lib/format";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function SmsFormDialog({ open, onOpenChange, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [recipientType, setRecipientType] = useState("all");

  function reset() {
    setName("");
    setMessage("");
    setRecipientType("all");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const result = await createSmsCampaignAction({
      name,
      message,
      recipientType,
    });

    setSaving(false);

    if (!result.ok) {
      toast.error("خطا در ایجاد کمپین");
      return;
    }

    toast.success("کمپین جدید ایجاد شد");
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>کمپین پیامکی جدید</DialogTitle>
          <DialogDescription>
            اطلاعات کمپین پیامکی را وارد کنید.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="sms-name">نام کمپین *</Label>
            <Input
              id="sms-name"
              dir="rtl"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً تبلیغات ویژه"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sms-message">متن پیام *</Label>
            <Textarea
              id="sms-message"
              dir="rtl"
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="متن پیامک..."
            />
            <p className="text-xs text-muted-foreground text-left" dir="ltr">
              {toFaDigits(message.length)} کاراکتر
            </p>
          </div>

          <div className="grid gap-2">
            <Label>نوع دریافت‌کنندگان</Label>
            <Select value={recipientType} onValueChange={setRecipientType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه مخاطبان</SelectItem>
                <SelectItem value="specific">مخاطبان خاص</SelectItem>
              </SelectContent>
            </Select>
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
              ایجاد کمپین
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
