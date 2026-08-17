"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createWebhookAction,
  deleteWebhookAction,
  toggleWebhookAction,
} from "@/actions/automation";
import type { Webhook } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const EVENT_OPTIONS = [
  "contact.created",
  "deal.created",
  "deal.stage_changed",
  "invoice.created",
  "invoice.paid",
  "payment.created",
  "appointment.created",
  "task.created",
];

export function WebhooksPanel({ webhooks }: { webhooks: Webhook[] }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function create() {
    setSaving(true);
    const res = await createWebhookAction({ name, url, events });
    setSaving(false);
    if (res.ok) {
      toast.success("وب‌هاوک ساخته شد");
      setName("");
      setUrl("");
      setEvents([]);
      router.refresh();
    } else {
      toast.error("خطا در ساخت وب‌هاوک");
    }
  }

  async function toggle(w: Webhook, active: boolean) {
    await toggleWebhookAction(w.id, active);
    router.refresh();
  }

  async function remove(w: Webhook) {
    if (!confirm("این وب‌هاوک حذف شود؟")) return;
    await deleteWebhookAction(w.id);
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">وب‌هاوک‌ها</CardTitle>
          <CardDescription>
            رویدادها با امضای HMAC و هدر x-crm-signature ارسال می‌شوند
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {webhooks.length === 0 && (
            <p className="text-sm text-muted-foreground">هنوز وب‌هاوکی ثبت نشده است</p>
          )}
          {webhooks.map((w) => (
            <div
              key={w.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{w.name}</p>
                  <Badge variant={w.active ? "default" : "secondary"}>
                    {w.active ? "فعال" : "غیرفعال"}
                  </Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground" dir="ltr">
                  {w.url}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {w.events.slice(0, 4).map((e) => (
                    <Badge key={e} variant="outline" className="font-mono text-[10px]">
                      {e}
                    </Badge>
                  ))}
                  {w.events.length > 4 && (
                    <Badge variant="outline">+{w.events.length - 4}</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={w.active} onCheckedChange={(v) => toggle(w, v)} />
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(w)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">وب‌هاوک جدید</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>نام</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً وب‌سایت" />
          </div>
          <div className="grid gap-2">
            <Label>آدرس (URL)</Label>
            <Input
              dir="ltr"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/crm"
            />
          </div>
          <div className="grid gap-2">
            <Label>رویدادها</Label>
            <div className="grid grid-cols-1 gap-1">
              {EVENT_OPTIONS.map((e) => (
                <label key={e} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={events.includes(e)}
                    onChange={() =>
                      setEvents((prev) =>
                        prev.includes(e)
                          ? prev.filter((x) => x !== e)
                          : [...prev, e]
                      )
                    }
                  />
                  <span className="font-mono text-xs">{e}</span>
                </label>
              ))}
            </div>
          </div>
          <Button onClick={create} disabled={saving || !name || !url || events.length === 0}>
            {saving ? "در حال ساخت…" : "ساخت وب‌هاوک"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
