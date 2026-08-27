"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteRecurringInvoiceAction } from "@/actions/recurring-invoices";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { RecurringInvoice } from "@/db/schema";

type Props = {
  initialInvoices: RecurringInvoice[];
  canManage: boolean;
};

const frequencyLabels: Record<string, string> = {
  weekly: "هفتگی",
  monthly: "ماهانه",
  quarterly: "فصلی",
  yearly: "سالانه",
};

const statusLabels: Record<string, { label: string; className: string }> = {
  active: {
    label: "فعال",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  paused: {
    label: "متوقف",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  completed: {
    label: "تکمیل‌شده",
    className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
};

export function RecurringInvoicesManager({
  initialInvoices,
  canManage,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [invoices, setInvoices] = useState(initialInvoices);

  async function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("آیا از حذف این فاکتور تکرارشونده اطمینان دارید؟")) return;
    const result = await deleteRecurringInvoiceAction(id);
    if (result.ok) {
      toast.success("فاکتور تکرارشونده حذف شد");
      setInvoices((prev) => prev.filter((i) => i.id !== id));
      handleRefresh();
    } else {
      toast.error("خطا در حذف");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">فاکتورهای تکرارشونده</CardTitle>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <EmptyState
            icon={RefreshCw}
            title="هنوز فاکتور تکرارشونده‌ای ثبت نشده"
            description="اولین فاکتور خودکار خود را ایجاد کنید."
          />
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => {
              const sl = statusLabels[inv.status] ?? statusLabels.active;
              return (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <RefreshCw className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {frequencyLabels[inv.frequency] ?? inv.frequency}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ایجاد: {formatDateTime(inv.createdAt)}
                        {inv.nextGenerationAt
                          ? ` · بعدی: ${formatDateTime(inv.nextGenerationAt)}`
                          : null}
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
                        onClick={() => handleDelete(inv.id)}
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
