"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, MessageCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteIntegrationAction,
  updateIntegrationAction,
} from "@/actions/messenger-integrations";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { MessengerConnectForm } from "@/components/messenger/messenger-connect-form";
import type { MessengerIntegration } from "@/db/schema";

type Props = {
  initialIntegrations: MessengerIntegration[];
  canManage: boolean;
};

const channelLabels: Record<string, string> = {
  whatsapp: "واتساپ",
  telegram: "تلگرام",
  instagram: "اینستاگرام",
  other: "سایر",
};

const statusLabels: Record<string, { label: string; className: string }> = {
  active: {
    label: "فعال",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  inactive: {
    label: "غیرفعال",
    className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
};

export function MessengerManager({ initialIntegrations, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [connectOpen, setConnectOpen] = useState(false);

  async function handleToggle(id: string, next: boolean) {
    startTransition(async () => {
      const res = await updateIntegrationAction(id, {
        status: next ? "active" : "inactive",
      });
      if (res.ok) {
        toast.success(next ? "اتصال فعال شد" : "اتصال غیرفعال شد");
        setIntegrations((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status: next ? "active" : "inactive" } : i))
        );
        router.refresh();
      } else {
        toast.error("خطا در تغییر وضعیت");
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("آیا از حذف این اتصال اطمینان دارید؟")) return;
    startTransition(async () => {
      const res = await deleteIntegrationAction(id);
      if (res.ok) {
        toast.success("اتصال حذف شد");
        setIntegrations((prev) => prev.filter((i) => i.id !== id));
        router.refresh();
      } else {
        toast.error("خطا در حذف");
      }
    });
  }

  function handleCopyWebhook(id: string) {
    const url = `${window.location.origin}/api/webhooks/messenger/${id}`;
    navigator.clipboard?.writeText(url).then(
      () => toast.success("آدرس Webhook کپی شد"),
      () => toast.error("خطا در کپی")
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {integrations.length} اتصال فعال
        </p>
        {canManage && (
          <Button onClick={() => setConnectOpen(true)}>
            <Plus className="ml-1 h-4 w-4" />
            اتصال جدید
          </Button>
        )}
      </div>

      {integrations.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="هنوز اتصالی ثبت نشده"
          description="اتصال واتساپ، تلگرام یا اینستاگرام خود را اضافه کنید."
        >
          {canManage && (
            <Button onClick={() => setConnectOpen(true)}>
              <Plus className="ml-1 h-4 w-4" />
              افزودن اتصال
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {integrations.map((i) => {
            const sl = statusLabels[i.status] ?? statusLabels.inactive;
            return (
              <Card key={i.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="size-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-base">{i.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {channelLabels[i.channel] ?? i.channel} · {formatDateTime(i.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={sl.className}>{sl.label}</Badge>
                      {canManage && (
                        <Switch
                          checked={i.status === "active"}
                          disabled={isPending}
                          onCheckedChange={(checked) => handleToggle(i.id, checked)}
                          title="تغییر وضعیت"
                        />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">آدرس Webhook:</p>
                    <div className="flex items-center gap-2">
                      <code
                        dir="ltr"
                        className="block flex-1 break-all rounded bg-muted px-2 py-1 text-[10px]"
                      >
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/api/webhooks/messenger/${i.id}`
                          : `/api/webhooks/messenger/${i.id}`}
                      </code>
                      {canManage && (
                        <Button
                          size="icon"
                          variant="outline"
                          title="کپی آدرس"
                          onClick={() => handleCopyWebhook(i.id)}
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex justify-end pt-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(i.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="ml-1 h-3.5 w-3.5" />
                        حذف
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <MessengerConnectForm open={connectOpen} onOpenChange={setConnectOpen} />
    </div>
  );
}
