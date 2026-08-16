"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { sendTestEmailAction, sendTestSmsAction } from "@/actions/automation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const NO = "پیکربندی نشده";

function EnvBadge({ set }: { set: boolean }) {
  return set ? (
    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
      <CheckCircle2 className="size-3" />
      پیکربندی‌شده
    </Badge>
  ) : (
    <Badge variant="secondary">
      <XCircle className="size-3" />
      {NO}
    </Badge>
  );
}

export function IntegrationsPanel({
  integrations,
}: {
  integrations: {
    email: boolean;
    resend: boolean;
    smtp: boolean;
    kavenegar: boolean;
  };
}) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState<string | null>(null);

  const { email: hasEmail, resend: hasResend, smtp: hasSmtp, kavenegar: hasKavenegar } = integrations;

  async function sendTest(kind: "email" | "sms") {
    if (kind === "email" && !email.trim()) {
      toast.error("ایمیل مقصد را وارد کنید");
      return;
    }
    if (kind === "sms" && !phone.trim()) {
      toast.error("شماره مقصد را وارد کنید");
      return;
    }
    setSending(kind);
    const res =
      kind === "email"
        ? await sendTestEmailAction(email.trim())
        : await sendTestSmsAction(phone.trim());
    setSending(null);
    if (res.ok) {
      toast.success(`پیام آزمایشی با ${res.provider} ارسال شد`);
    } else {
      toast.error(`خطا: ${res.error ?? "ارسال نشد"}`);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">ایمیل</CardTitle>
            <EnvBadge set={hasEmail} />
          </div>
          <CardDescription>
            ارائه‌دهنده Resend یا SMTP از متغیرهای محیطی خوانده می‌شود
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Resend</span>
              <span className="font-mono text-xs">{hasResend ? "RESEND_API_KEY ✓" : NO}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SMTP</span>
              <span className="font-mono text-xs">{hasSmtp ? "SMTP_HOST ✓" : NO}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              dir="ltr"
              type="email"
              placeholder="ایمیل برای آزمایش"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => sendTest("email")}
              disabled={sending === "email"}
            >
              {sending === "email" ? "در حال ارسال…" : "ارسال آزمایشی"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">پیامک (کاوه‌نگار)</CardTitle>
            <EnvBadge set={hasKavenegar} />
          </div>
          <CardDescription>
            بدون کلید، پیام‌ها در لاگ ثبت می‌شوند
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Kavenegar</span>
            <span className="font-mono text-xs">{hasKavenegar ? "KAVENEGAR_API_KEY ✓" : NO}</span>
          </div>
          <div className="flex gap-2">
            <Input
              dir="ltr"
              placeholder="شماره برای آزمایش"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => sendTest("sms")}
              disabled={sending === "sms"}
            >
              {sending === "sms" ? "در حال ارسال…" : "ارسال آزمایشی"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
