"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Send, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import {
  listSmsCampaignsAction,
  deleteSmsCampaignAction,
  sendSmsCampaignAction,
} from "@/actions/sms";
import { formatDateTime, toFaDigits } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SmsFormDialog } from "./sms-form";
import type { smsCampaigns } from "@/db/schema";

type CampaignRow = typeof smsCampaigns.$inferSelect;

type Props = {
  initialCampaigns: CampaignRow[];
  canManage: boolean;
};

const statusLabels: Record<string, { label: string; className: string }> = {
  draft: { label: "پیش‌نویس", className: "bg-muted text-muted-foreground" },
  scheduled: {
    label: "زمان‌بندی‌شده",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  sending: {
    label: "در حال ارسال",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  sent: {
    label: "ارسال‌شده",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  failed: {
    label: "ناموفق",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
};

export function SmsManager({ initialCampaigns, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [formOpen, setFormOpen] = useState(false);

  async function handleRefresh() {
    startTransition(async () => {
      const res = await listSmsCampaignsAction();
      if (res.ok) setCampaigns(res.data);
      router.refresh();
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("آیا از حذف این کمپین اطمینان دارید؟")) return;
    const result = await deleteSmsCampaignAction(id);
    if (result.ok) {
      toast.success("کمپین حذف شد");
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } else {
      toast.error("خطا در حذف کمپین");
    }
  }

  async function handleSend(id: string) {
    if (!confirm("آیا از ارسال این کمپین اطمینان دارید؟")) return;
    const result = await sendSmsCampaignAction(id);
    if (result.ok) {
      toast.success("کمپین با موفقیت ارسال شد");
      handleRefresh();
    } else {
      toast.error("خطا در ارسال کمپین");
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">کمپین‌های پیامکی</CardTitle>
          {canManage && (
            <Button
              size="sm"
              onClick={() => setFormOpen(true)}
              disabled={isPending}
            >
              <Plus className="size-4" />
              کمپین جدید
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="هنوز کمپینی ایجاد نشده"
              description="اولین کمپین پیامکی خود را بسازید."
            >
              {canManage && (
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  <Plus className="size-4" />
                  کمپین جدید
                </Button>
              )}
            </EmptyState>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نام</TableHead>
                    <TableHead>متن پیام</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead className="text-left">ارسال‌شده</TableHead>
                    <TableHead>تاریخ ایجاد</TableHead>
                    <TableHead className="text-left">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => {
                    const sl = statusLabels[c.status] ?? statusLabels.draft;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {c.message}
                        </TableCell>
                        <TableCell>
                          <Badge className={sl.className}>{sl.label}</Badge>
                        </TableCell>
                        <TableCell className="text-left tabular-nums">
                          {toFaDigits(c.totalSent ?? 0)}
                        </TableCell>
                        <TableCell>{formatDateTime(c.createdAt)}</TableCell>
                        <TableCell className="text-left">
                          <div className="flex justify-end gap-1">
                            {canManage && c.status === "draft" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="ارسال"
                                disabled={isPending}
                                onClick={() => handleSend(c.id)}
                              >
                                <Send className="size-4 text-emerald-600" />
                              </Button>
                            )}
                            {canManage && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="حذف"
                                disabled={isPending}
                                onClick={() => handleDelete(c.id)}
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <SmsFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={() => {
          setFormOpen(false);
          handleRefresh();
        }}
      />
    </>
  );
}
