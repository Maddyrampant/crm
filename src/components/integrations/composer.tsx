"use client";

import { useState } from "react";
import { Mail, Send, Smartphone } from "lucide-react";
import type { EmailTemplate } from "@/db/schema";
import { sendMessageAction } from "@/actions/automation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ComposerContact = {
  id?: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
};

export function Composer({
  templates = [],
  contact,
}: {
  templates?: EmailTemplate[];
  contact?: ComposerContact;
}) {
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [to, setTo] = useState(
    channel === "email" ? contact?.email ?? "" : contact?.phone ?? ""
  );
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  function pickTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setSubject(t.subject);
    setBody(t.body);
  }

  function switchChannel(next: "email" | "sms") {
    setChannel(next);
    setTo(next === "email" ? contact?.email ?? "" : contact?.phone ?? "");
    setResult(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setResult(null);
    const res = await sendMessageAction(channel, {
      to,
      subject,
      body,
      contactId: contact?.id,
      templateVars: { "contact.name": contact?.name ?? null },
    });
    setSending(false);
    setResult(
      res.ok ? "پیام با موفقیت ارسال شد" : `خطا: ${res.error ?? "ارسال ناموفق"}`
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {channel === "email" ? <Mail className="size-4" /> : <Smartphone className="size-4" />}
          ارسال پیام
        </CardTitle>
        <CardDescription>
          ارسال ایمیل یا پیامک به مخاطب
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={channel === "email" ? "default" : "outline"}
            onClick={() => switchChannel("email")}
          >
            <Mail />
            ایمیل
          </Button>
          <Button
            type="button"
            size="sm"
            variant={channel === "sms" ? "default" : "outline"}
            onClick={() => switchChannel("sms")}
          >
            <Smartphone />
            پیامک
          </Button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="composer-to">
              {channel === "email" ? "گیرنده (ایمیل)" : "گیرنده (شماره)"}
            </Label>
            <Input
              id="composer-to"
              dir="ltr"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder={channel === "email" ? "you@example.com" : "09120000000"}
              required
            />
          </div>

          {channel === "email" && (
            <div className="grid gap-2">
              <Label htmlFor="composer-subject">موضوع</Label>
              <Input
                id="composer-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="موضوع ایمیل"
                required
              />
            </div>
          )}

          {channel === "email" && templates.length > 0 && (
            <div className="grid gap-2">
              <Label>الگو</Label>
              <Select onValueChange={pickTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="استفاده از الگو (اختیاری)" />
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
            <Label htmlFor="composer-body">متن پیام</Label>
            <Textarea
              id="composer-body"
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="متن پیام…"
              required
            />
            <p className="text-xs text-muted-foreground">
              متغیرهای قابل استفاده: {"{{contact.name}}"}، {"{{contact.company}}"}، {"{{workspace.name}}"}
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={sending}>
            <Send className="-scale-x-100" />
            {sending ? "در حال ارسال…" : "ارسال"}
          </Button>

          {result && (
            <p
              className={`text-sm ${result.startsWith("خطا") ? "text-destructive" : "text-emerald-600"}`}
            >
              {result}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
