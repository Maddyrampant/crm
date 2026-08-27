"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Shield, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { deleteSlaPolicyAction, checkBreachedSlasAction } from "@/actions/sla-tracker";
import { formatDateTime, toFaDigits } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SlaPolicyFormDialog } from "./sla-policy-form-dialog";
import type { SlaPolicy, SlaInstance } from "@/db/schema";

type Props = {
  initialPolicies: SlaPolicy[];
  initialInstances: SlaInstance[];
  canManage: boolean;
};

export function SlaManager({ initialPolicies, initialInstances, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [policies, setPolicies] = useState(initialPolicies);
  const [instances, setInstances] = useState(initialInstances);
  const [formOpen, setFormOpen] = useState(false);

  async function handleDelete(id: string) {
    if (!confirm("آیا از حذف این سیاست اطمینان دارید؟")) return;
    const result = await deleteSlaPolicyAction(id);
    if (result.ok) {
      toast.success("سیاست حذف شد");
      setPolicies((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    } else {
      toast.error("خطا در حذف");
    }
  }

  async function handleCheckBreached() {
    const breached = await checkBreachedSlasAction();
    if (breached.length > 0) {
      toast.warning(`${breached.length} SLA نقض شده شناسایی شد`);
    } else {
      toast.success("هیچ SLA نقض شده‌ای وجود ندارد");
    }
    router.refresh();
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Shield className="size-4 text-blue-500" />
            <CardTitle className="text-sm font-medium">سیاست‌های فعال</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{toFaDigits(policies.length)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Clock className="size-4 text-amber-500" />
            <CardTitle className="text-sm font-medium">در حال پیگیری</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{toFaDigits(instances.length)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <CheckCircle className="size-4 text-emerald-500" />
            <CardTitle className="text-sm font-medium">عملیات</CardTitle>
          </CardHeader>
          <CardContent>
            {canManage && (
              <Button size="sm" variant="outline" onClick={handleCheckBreached} disabled={isPending}>
                <AlertTriangle className="size-4" />
                بررسی نقض‌ها
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">سیاست‌های SLA</CardTitle>
          {canManage && (
            <Button size="sm" onClick={() => setFormOpen(true)} disabled={isPending}>
              <Plus className="size-4" />
              سیاست جدید
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <EmptyState icon={Shield} title="هنوز سیاستی تعریف نشده" description="سیاست‌های زمان‌بندی خدمات را تعریف کنید." />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نام</TableHead>
                    <TableHead>نوع</TableHead>
                    <TableHead className="text-left">زمان پاسخ (ساعت)</TableHead>
                    <TableHead className="text-left">زمان حل (ساعت)</TableHead>
                    <TableHead className="text-left">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.entityType}</TableCell>
                      <TableCell className="text-left tabular-nums">{toFaDigits(p.responseTimeHours)}</TableCell>
                      <TableCell className="text-left tabular-nums">{toFaDigits(p.resolutionTimeHours)}</TableCell>
                      <TableCell className="text-left">
                        {canManage && (
                          <Button size="icon" variant="ghost" title="حذف" disabled={isPending} onClick={() => handleDelete(p.id)}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {instances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">موارد در حال پیگیری</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نوع</TableHead>
                    <TableHead>شناسه</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>ددلاین پاسخ</TableHead>
                    <TableHead>ددلاین حل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instances.map((inst) => (
                    <TableRow key={inst.id}>
                      <TableCell>{inst.entityType}</TableCell>
                      <TableCell className="text-xs font-mono">{inst.entityId.slice(0, 8)}...</TableCell>
                      <TableCell>
                        <span className={inst.status === "breached" ? "text-red-600" : inst.status === "met" ? "text-emerald-600" : "text-amber-600"}>
                          {inst.status === "breached" ? "نقص" : inst.status === "met" ? "رعایت شده" : "فعال"}
                        </span>
                      </TableCell>
                      <TableCell>{formatDateTime(inst.responseDeadline)}</TableCell>
                      <TableCell>{formatDateTime(inst.resolutionDeadline)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <SlaPolicyFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={() => { setFormOpen(false); router.refresh(); }} />
    </>
  );
}
