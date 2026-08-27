"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Star, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import { deleteSurveyAction } from "@/actions/csat-surveys";
import { formatDateTime, toFaDigits } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SurveyFormDialog } from "./survey-form-dialog";
import type { CsatSurvey } from "@/db/schema";

type Props = {
  initialSurveys: CsatSurvey[];
  initialStats: { csatAvg: number; npsAvg: number; totalSent: number; totalCompleted: number; responseRate: number };
  canManage: boolean;
};

const typeLabels: Record<string, string> = { csat: "CSAT", nps: "NPS", ces: "CES" };
const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: "در انتظار", className: "bg-muted text-muted-foreground" },
  sent: { label: "ارسال‌شده", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  completed: { label: "تکمیل", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
};

export function CsatManager({ initialSurveys, initialStats, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [surveys, setSurveys] = useState(initialSurveys);
  const [stats] = useState(initialStats);
  const [formOpen, setFormOpen] = useState(false);

  async function handleDelete(id: string) {
    if (!confirm("آیا از حذف این نظرسنجی اطمینان دارید؟")) return;
    const result = await deleteSurveyAction(id);
    if (result.ok) {
      toast.success("نظرسنجی حذف شد");
      setSurveys((prev) => prev.filter((s) => s.id !== id));
      router.refresh();
    } else {
      toast.error("خطا در حذف");
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Star className="size-4 text-amber-500" />
            <CardTitle className="text-sm font-medium">میانگین CSAT</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{toFaDigits(stats.csatAvg)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <TrendingUp className="size-4 text-emerald-500" />
            <CardTitle className="text-sm font-medium">میانگین NPS</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{toFaDigits(stats.npsAvg)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Users className="size-4 text-blue-500" />
            <CardTitle className="text-sm font-medium">کل ارسال‌شده</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{toFaDigits(stats.totalSent)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Star className="size-4 text-purple-500" />
            <CardTitle className="text-sm font-medium">نرخ پاسخ‌دهی</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">%{toFaDigits(stats.responseRate)}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">لیست نظرسنجی‌ها</CardTitle>
          {canManage && (
            <Button size="sm" onClick={() => setFormOpen(true)} disabled={isPending}>
              <Plus className="size-4" />
              نظرسنجی جدید
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {surveys.length === 0 ? (
            <EmptyState icon={Star} title="هنوز نظرسنجی ایجاد نشده" description="اولین نظرسنجی رضایت مشتری را بفرستید." />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نوع</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>امتیاز</TableHead>
                    <TableHead>نظر</TableHead>
                    <TableHead>تاریخ ایجاد</TableHead>
                    <TableHead className="text-left">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surveys.map((s) => {
                    const sl = statusLabels[s.status] ?? statusLabels.pending;
                    return (
                      <TableRow key={s.id}>
                        <TableCell><Badge variant="outline">{typeLabels[s.type] ?? s.type}</Badge></TableCell>
                        <TableCell><Badge className={sl.className}>{sl.label}</Badge></TableCell>
                        <TableCell className="tabular-nums">{s.score ?? "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{s.comment ?? "-"}</TableCell>
                        <TableCell>{formatDateTime(s.createdAt)}</TableCell>
                        <TableCell className="text-left">
                          {canManage && (
                            <Button size="icon" variant="ghost" title="حذف" disabled={isPending} onClick={() => handleDelete(s.id)}>
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          )}
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

      <SurveyFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={() => { setFormOpen(false); router.refresh(); }} />
    </>
  );
}
