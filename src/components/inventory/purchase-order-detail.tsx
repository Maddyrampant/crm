"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  updatePurchaseOrderStatusAction,
  deletePurchaseOrderAction,
} from "@/actions/inventory";
import {
  PURCHASE_ORDER_STATUS_LABELS,
  type PurchaseOrderStatus,
} from "@/lib/inventory";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/format";
import type { PurchaseOrder, PurchaseOrderItem } from "@/db/schema";

type Props = {
  order: PurchaseOrder & {
    supplierName: string | null;
    items: {
      item: PurchaseOrderItem;
      productName: string | null;
      unit: string | null;
    }[];
  };
  canManage: boolean;
};

const STATUS_VARIANT: Record<
  PurchaseOrderStatus,
  "outline" | "default" | "secondary" | "destructive"
> = {
  draft: "outline",
  ordered: "default",
  received: "secondary",
  cancelled: "destructive",
};

export function PurchaseOrderDetail({ order, canManage }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | PurchaseOrderStatus | null>(
    null
  );

  const total = order.items.reduce(
    (acc, it) => acc + Number(it.item.quantity) * Number(it.item.unitPrice),
    0
  );

  async function changeStatus(status: PurchaseOrderStatus) {
    setBusy(true);
    try {
      await updatePurchaseOrderStatusAction(order.id, status);
      toast.success(
        status === "received"
          ? "سفارش دریافت شد و موجودی به انبار پیش‌فرض اضافه شد"
          : status === "ordered"
            ? "سفارش ثبت شد"
            : "سفارش لغو شد"
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در تغییر وضعیت");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deletePurchaseOrderAction(order.id);
      toast.success("سفارش حذف شد");
      router.push("/purchases");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در حذف سفارش");
      setBusy(false);
      setConfirm(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/purchases">
            <ArrowRight className="size-4" />
            بازگشت به سفارش‌ها
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold" dir="ltr">
            {order.number}
          </span>
          <Badge variant={STATUS_VARIANT[order.status]}>
            {PURCHASE_ORDER_STATUS_LABELS[order.status]}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">اطلاعات سفارش</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">تأمین‌کننده</span>
            <span className="font-medium">{order.supplierName || "—"}</span>
          </div>
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">تاریخ ایجاد</span>
            <span>{formatDateTime(order.createdAt)}</span>
          </div>
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">دریافت مورد انتظار</span>
            <span>{order.expectedAt ? formatDate(order.expectedAt) : "—"}</span>
          </div>
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">جمع کل</span>
            <span className="font-semibold tabular-nums">
              {formatCurrency(total)}
            </span>
          </div>
          {order.notes && (
            <div className="grid gap-1 sm:col-span-2">
              <span className="text-xs text-muted-foreground">یادداشت</span>
              <p className="whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">اقلام</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>کالا</TableHead>
                <TableHead className="text-center">تعداد</TableHead>
                <TableHead className="text-end">قیمت واحد</TableHead>
                <TableHead className="text-end">مبلغ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((it) => (
                <TableRow key={it.item.id}>
                  <TableCell>
                    <span className="block font-medium">
                      {it.productName || "—"}
                    </span>
                    {it.unit && (
                      <span className="text-xs text-muted-foreground">
                        {it.unit}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {formatNumber(Number(it.item.quantity))}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {formatCurrency(it.item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-end font-medium tabular-nums">
                    {formatCurrency(Number(it.item.quantity) * Number(it.item.unitPrice))}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} className="text-end font-medium">
                  جمع کل
                </TableCell>
                <TableCell className="text-end font-bold tabular-nums">
                  {formatCurrency(total)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canManage && order.status !== "received" && order.status !== "cancelled" && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {order.status === "draft" && (
            <Button onClick={() => setConfirm("ordered")} disabled={busy}>
              <Send className="size-4" />
              ثبت سفارش
            </Button>
          )}
          {order.status === "ordered" && (
            <Button onClick={() => setConfirm("received")} disabled={busy}>
              <CheckCircle2 className="size-4" />
              ثبت دریافت کالا
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setConfirm("cancelled")}
            disabled={busy}
          >
            <XCircle className="size-4" />
            لغو سفارش
          </Button>
          <Button
            variant="destructive"
            onClick={() => setConfirm("delete")}
            disabled={busy}
          >
            <Trash2 className="size-4" />
            حذف
          </Button>
        </div>
      )}

      <Dialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirm === "delete"
                ? "حذف سفارش"
                : confirm === "received"
                  ? "دریافت کالا"
                  : confirm === "ordered"
                    ? "ثبت سفارش"
                    : "لغو سفارش"}
            </DialogTitle>
            <DialogDescription>
              {confirm === "delete"
                ? "مطمئن هستید؟ این عمل قابل بازگشت نیست."
                : confirm === "received"
                  ? "موجودی اقلام به انبار پیش‌فرض اضافه می‌شود. ادامه می‌دهید؟"
                  : confirm === "cancelled"
                    ? "سفارش لغو می‌شود. ادامه می‌دهید؟"
                    : "وضعیت سفارش به «سفارش‌شده» تغییر می‌کند. ادامه می‌دهید؟"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={busy}>
              انصراف
            </Button>
            <Button
              variant={confirm === "delete" || confirm === "cancelled" ? "destructive" : "default"}
              onClick={() =>
                confirm === "delete" ? handleDelete() : confirm && changeStatus(confirm)
              }
              disabled={busy}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              تأیید
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
