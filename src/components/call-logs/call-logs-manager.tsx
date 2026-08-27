"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed } from "lucide-react";
import { toast } from "sonner";
import { deleteCallLogAction } from "@/actions/call-logs";
import { formatDateTime, toFaDigits } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CallLogFormDialog } from "./call-log-form-dialog";
import type { CallLog } from "@/db/schema";

type Props = {
  initialLogs: CallLog[];
  canManage: boolean;
};

const outcomeLabels: Record<string, { label: string; className: string }> = {
  connected: { label: "متصل", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  no_answer: { label: "بی‌پاسخ", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  voicemail: { label: "پیام صوتی", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  busy: { label: "مشغول", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  wrong_number: { label: "شماره اشتباه", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

function formatDuration(seconds: number | null) {
  if (!seconds) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function CallLogsManager({ initialLogs, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [logs, setLogs] = useState(initialLogs);
  const [formOpen, setFormOpen] = useState(false);

  async function handleRefresh() {
    startTransition(() => { router.refresh(); });
  }

  async function handleDelete(id: string) {
    if (!confirm("آیا از حذف این لاگ اطمینان دارید؟")) return;
    const result = await deleteCallLogAction(id);
    if (result.ok) {
      toast.success("لاگ حذف شد");
      setLogs((prev) => prev.filter((l) => l.id !== id));
      router.refresh();
    } else {
      toast.error("خطا در حذف");
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">لاگ تماس‌ها</CardTitle>
          {canManage && (
            <Button size="sm" onClick={() => setFormOpen(true)} disabled={isPending}>
              <Plus className="size-4" />
              ثبت تماس
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <EmptyState icon={Phone} title="هنوز لاگی ثبت نشده" description="اولین تماس خود را ثبت کنید.">
              {canManage && (
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  <Plus className="size-4" />
                  ثبت تماس
                </Button>
              )}
            </EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>جهت</TableHead>
                    <TableHead>شماره</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>مدت</TableHead>
                    <TableHead>یادداشت</TableHead>
                    <TableHead>تاریخ</TableHead>
                    <TableHead className="text-left">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => {
                    const ol = outcomeLabels[l.outcome] ?? outcomeLabels.connected;
                    return (
                      <TableRow key={l.id}>
                        <TableCell>
                          {l.direction === "inbound" ? (
                            <PhoneIncoming className="size-4 text-emerald-600" />
                          ) : (
                            <PhoneOutgoing className="size-4 text-blue-600" />
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums" dir="ltr">{l.phone ?? "-"}</TableCell>
                        <TableCell><Badge className={ol.className}>{ol.label}</Badge></TableCell>
                        <TableCell className="tabular-nums">{formatDuration(l.duration)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{l.notes ?? "-"}</TableCell>
                        <TableCell>{formatDateTime(l.startedAt)}</TableCell>
                        <TableCell className="text-left">
                          <div className="flex justify-end gap-1">
                            {canManage && (
                              <Button size="icon" variant="ghost" title="حذف" disabled={isPending} onClick={() => handleDelete(l.id)}>
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

      <CallLogFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={() => { setFormOpen(false); handleRefresh(); }} />
    </>
  );
}
