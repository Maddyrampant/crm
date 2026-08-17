"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { createSmsCampaignAction } from "@/actions/sms";

type Props = {
  onCreated: () => void;
};

export function SmsCampaignForm({ onCreated }: Props) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [recipientType, setRecipientType] = useState("all");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      toast.error("نام و پیام را وارد کنید");
      return;
    }
    startTransition(async () => {
      const res = await createSmsCampaignAction({
        name: name.trim(),
        message: message.trim(),
        recipientType,
      });
      if (res.ok) {
        toast.success("کمپین ایجاد شد");
        setName("");
        setMessage("");
        setRecipientType("all");
        onCreated();
      } else {
        toast.error("خطا در ایجاد کمپین");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold">کمپین جدید</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>نام کمپین</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="تبلیغات نوروزی"
          />
        </div>
        <div className="space-y-2">
          <Label>گیرندگان</Label>
          <Select value={recipientType} onValueChange={setRecipientType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه مخاطبین</SelectItem>
              <SelectItem value="leads">لیدها</SelectItem>
              <SelectItem value="customers">مشتریان</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>متن پیام</Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="متن پیامک..."
          rows={3}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "در حال ایجاد..." : "ایجاد کمپین"}
      </Button>
    </form>
  );
}
