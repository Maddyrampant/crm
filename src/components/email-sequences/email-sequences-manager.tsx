"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Mail, Play, Pause, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { deleteSequenceAction, updateSequenceAction } from "@/actions/email-sequences";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SequenceFormDialog } from "./sequence-form-dialog";
import type { EmailSequence } from "@/db/schema";

type Props = {
  initialSequences: EmailSequence[];
  canManage: boolean;
};

const statusLabels: Record<string, { label: string; className: string }> = {
  draft: { label: "پیش‌نویس", className: "bg-muted text-muted-foreground" },
  active: { label: "فعال", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  paused: { label: "متوقف", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  completed: { label: "تکمیل", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
};

export function EmailSequencesManager({ initialSequences, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sequences, setSequences] = useState(initialSequences);
  const [formOpen, setFormOpen] = useState(false);

  async function handleRefresh() {
    startTransition(async () => {
      router.refresh();
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("آیا از حذف این دنباله اطمینان دارید؟")) return;
    const result = await deleteSequenceAction(id);
    if (result.ok) {
      toast.success("دنباله حذف شد");
      setSequences((prev) => prev.filter((s) => s.id !== id));
      router.refresh();
    } else {
      toast.error("خطا در حذف");
    }
  }

  async function handleToggleStatus(id: string, current: string) {
    const next = current === "active" ? "paused" : "active";
    const result = await updateSequenceAction(id, { status: next });
    if (result.ok) {
      toast.success(`دنباله ${next === "active" ? "فعال" : "متوقف"} شد`);
      setSequences((prev) => prev.map((s) => s.id === id ? { ...s, status: next as EmailSequence["status"] } : s));
      router.refresh();
    } else {
      toast.error("خطا در بروزرسانی");
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">دنباله‌های ایمیل</CardTitle>
          {canManage && (
            <Button size="sm" onClick={() => setFormOpen(true)} disabled={isPending}>
              <Plus className="size-4" />
              دنباله جدید
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {sequences.length === 0 ? (
            <EmptyState icon={Mail} title="هنوز دنباله‌ای ایجاد نشده" description="اولین دنباله ایمیل خودکار خود را بسازید.">
              {canManage && (
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  <Plus className="size-4" />
                  دنباله جدید
                </Button>
              )}
            </EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نام</TableHead>
                    <TableHead>موضوع</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead className="text-left">ثبت‌نام‌شده</TableHead>
                    <TableHead className="text-left">ارسال‌شده</TableHead>
                    <TableHead>تاریخ ایجاد</TableHead>
                    <TableHead className="text-left">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sequences.map((s) => {
                    const sl = statusLabels[s.status] ?? statusLabels.draft;
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{s.subject}</TableCell>
                        <TableCell><Badge className={sl.className}>{sl.label}</Badge></TableCell>
                        <TableCell className="text-left tabular-nums">{s.totalEnrolled}</TableCell>
                        <TableCell className="text-left tabular-nums">{s.totalSent}</TableCell>
                        <TableCell>{formatDateTime(s.createdAt)}</TableCell>
                        <TableCell className="text-left">
                          <div className="flex justify-end gap-1">
                            {canManage && (
                              <Button size="icon" variant="ghost" title={s.status === "active" ? "توقف" : "فعال‌سازی"} disabled={isPending} onClick={() => handleToggleStatus(s.id, s.status)}>
                                {s.status === "active" ? <Pause className="size-4 text-amber-600" /> : <Play className="size-4 text-emerald-600" />}
                              </Button>
                            )}
                            {canManage && (
                              <Button size="icon" variant="ghost" title="حذف" disabled={isPending} onClick={() => handleDelete(s.id)}>
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

      <SequenceFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={() => { setFormOpen(false); handleRefresh(); }} />
    </>
  );
}
