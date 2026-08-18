"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createApiKeyAction, revokeApiKeyAction } from "@/actions/automation";
import type { ApiKey } from "@/db/schema";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ApiKeysPanel({ keys }: { keys: ApiKey[] }) {
  const [name, setName] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    const res = await createApiKeyAction(name.trim());
    setSaving(false);
    if (res.ok) {
      setSecret(res.secret);
      setName("");
      router.refresh();
    } else {
      toast.error("خطا در ساخت کلید");
    }
  }

  async function revoke(key: ApiKey) {
    if (!confirm("این کلید غیرفعال شود؟")) return;
    await revokeApiKeyAction(key.id);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">کلیدهای API</CardTitle>
        <CardDescription>
          با هدر <code className="rounded bg-muted px-1">Authorization: Bearer crm_…</code> به
          /api/v1 دسترسی بگیرید
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="نام کلید…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button onClick={create} disabled={saving || !name.trim()}>
            <KeyRound />
            ساخت کلید
          </Button>
        </div>

        <div className="space-y-2">
          {keys.length === 0 && (
            <p className="text-sm text-muted-foreground">کلیدی ساخته نشده است</p>
          )}
          {keys.map((k) => (
            <div
              key={k.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{k.name}</p>
                  {!k.active && (
                    <Badge variant="secondary">غیرفعال</Badge>
                  )}
                </div>
                <p className="font-mono text-xs text-muted-foreground" dir="ltr">
                  {k.prefix}
                  <span className="mx-1 text-muted">•</span>
                  ساخته‌شده: {formatDate(k.createdAt)}
                </p>
              </div>
              {k.active && (
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => revoke(k)}>
                  <Trash2 className="size-4" />
                  غیرفعال‌سازی
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={Boolean(secret)} onOpenChange={(o) => !o && setSecret(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>کلید شما ساخته شد</DialogTitle>
            <DialogDescription>
              این کلید فقط یک بار نمایش داده می‌شود؛ آن را کپی و ذخیره کنید.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 rounded-lg border bg-muted p-3">
            <code className="flex-1 break-all font-mono text-xs" dir="ltr">
              {secret}
            </code>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                navigator.clipboard?.writeText(secret ?? "");
                toast.success("کپی شد");
              }}
            >
              <Copy className="size-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setSecret(null)}>باشه</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
