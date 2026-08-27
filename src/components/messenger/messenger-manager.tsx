"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteIntegrationAction } from "@/actions/messenger-integrations";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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

  async function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("آیا از حذف این اتصال اطمینان دارید؟")) return;
    const result = await deleteIntegrationAction(id);
    if (result.ok) {
      toast.success("اتصال حذف شد");
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
      handleRefresh();
    } else {
      toast.error("خطا در حذف");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">اتصالات پیام‌رسان‌ها</CardTitle>
      </CardHeader>
      <CardContent>
        {integrations.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="هنوز اتصالی ثبت نشده"
            description="اتصال واتساپ، تلگرام یا اینستاگرام خود را اضافه کنید."
          />
        ) : (
          <div className="space-y-2">
            {integrations.map((i) => {
              const sl = statusLabels[i.status] ?? statusLabels.inactive;
              return (
                <div
                  key={i.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <MessageCircle className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{i.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {channelLabels[i.channel] ?? i.channel} · {formatDateTime(i.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={sl.className}>{sl.label}</Badge>
                    {canManage && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="حذف"
                        disabled={isPending}
                        onClick={() => handleDelete(i.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
