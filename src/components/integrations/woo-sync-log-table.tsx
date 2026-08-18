"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getWooSyncLogs } from "@/actions/woocommerce";

type Log = {
  id: string;
  topic: string;
  resource: string;
  resourceId: string | null;
  action: string;
  status: string;
  error: string | null;
  createdAt: Date;
};

type Props = {
  storeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const RESOURCE_LABELS: Record<string, string> = {
  customer: "مشتری",
  order: "سفارش",
  product: "محصول",
};

const ACTION_LABELS: Record<string, string> = {
  created: "ایجاد",
  updated: "بروزرسانی",
  deleted: "حذف",
};

export function WooSyncLogTable({ storeId, open, onOpenChange }: Props) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !storeId) return;
    setLoading(true);
    getWooSyncLogs(storeId, 50).then((res) => {
      if (res.ok) setLogs(res.data);
      else toast.error(res.error);
      setLoading(false);
    });
  }, [open, storeId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>لاگ همگام‌سازی</DialogTitle>
        </DialogHeader>

        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              هنوز رویدادی ثبت نشده
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 px-2 text-right">وضعیت</th>
                  <th className="py-2 px-2 text-right">منبع</th>
                  <th className="py-2 px-2 text-right">عملیات</th>
                  <th className="py-2 px-2 text-right">شناسه</th>
                  <th className="py-2 px-2 text-right">زمان</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="py-2 px-2">
                      {log.status === "success" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          <CheckCircle2 className="ml-1 h-3 w-3" />
                          موفق
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="ml-1 h-3 w-3" />
                          خطا
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      {RESOURCE_LABELS[log.resource] ?? log.resource}
                    </td>
                    <td className="py-2 px-2">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </td>
                    <td className="py-2 px-2 font-mono text-xs" dir="ltr">
                      {log.resourceId ?? "-"}
                    </td>
                    <td className="py-2 px-2 text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString("fa-IR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
