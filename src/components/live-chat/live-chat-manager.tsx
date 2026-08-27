"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { closeSessionAction } from "@/actions/live-chat";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { LiveChatSession } from "@/db/schema";

type Props = {
  initialSessions: LiveChatSession[];
  canManage: boolean;
};

const statusLabels: Record<string, { label: string; className: string }> = {
  active: {
    label: "فعال",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  closed: {
    label: "بسته‌شده",
    className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
  pending: {
    label: "در انتظار",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
};

export function LiveChatManager({ initialSessions, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sessions, setSessions] = useState(initialSessions);

  async function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleClose(id: string) {
    if (!confirm("آیا از بستن این نشست چت اطمینان دارید؟")) return;
    const result = await closeSessionAction(id);
    if (result.ok) {
      toast.success("نشست چت بسته شد");
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "closed" } : s))
      );
      handleRefresh();
    } else {
      toast.error("خطا در بستن نشست");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">نشست‌های چت زنده</CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="هنوز نشستی ثبت نشده"
            description="وقتی بازدیدکنندگان سایت شروع به چت کنند، اینجا نمایش داده می‌شوند."
          />
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => {
              const sl = statusLabels[s.status] ?? statusLabels.active;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {s.visitorName ?? s.visitorEmail ?? "بازدیدکننده ناشناس"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(s.startedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={sl.className}>{sl.label}</Badge>
                    {canManage && s.status !== "closed" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="بستن"
                        disabled={isPending}
                        onClick={() => handleClose(s.id)}
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
