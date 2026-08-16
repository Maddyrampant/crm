"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ClipboardList,
  Eye,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listPurchaseOrdersAction,
  deletePurchaseOrderAction,
} from "@/actions/inventory";
import { PurchaseOrderFormDialog } from "@/components/inventory/purchase-order-form-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  PURCHASE_ORDER_STATUS_LABELS,
  type PurchaseOrderStatus,
} from "@/lib/inventory";
import { formatDate, formatNumber } from "@/lib/format";
import type { PurchaseOrder, Supplier } from "@/db/schema";
import type { ProductWithStock } from "@/lib/inventory";

type Props = {
  initialData: (PurchaseOrder & { supplierName: string | null; itemCount: number })[];
  suppliers: Supplier[];
  products: ProductWithStock[];
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

export function PurchaseOrdersTable({
  initialData,
  suppliers,
  products,
  canManage,
}: Props) {
  const [orders, setOrders] = useState(initialData);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<PurchaseOrder | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    try {
      const result = await listPurchaseOrdersAction();
      setOrders(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در بارگذاری سفارش‌ها");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await deletePurchaseOrderAction(deleting.id);
      toast.success("سفارش حذف شد");
      setOrders((o) => o.filter((x) => x.id !== deleting.id));
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در حذف سفارش");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">سفارش‌های خرید</CardTitle>
          {canManage && (
            <Button
              size="sm"
              onClick={() => setFormOpen(true)}
            >
              <Plus className="size-4" />
              سفارش جدید
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="سفارشی ثبت نشده است"
              description={
                canManage
                  ? "اولین سفارش خرید را بسازید تا رسید کالا را ثبت کنید."
                  : "مدیر فضای کاری، سفارش‌های خرید را می‌سازد."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>شماره سفارش</TableHead>
                  <TableHead>تأمین‌کننده</TableHead>
                  <TableHead className="text-center">اقلام</TableHead>
                  <TableHead>تاریخ مورد انتظار</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>تاریخ ایجاد</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link
                        href={`/purchases/${o.id}`}
                        className="font-medium hover:underline"
                        dir="ltr"
                      >
                        {o.number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {o.supplierName || "—"}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {formatNumber(o.itemCount)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {o.expectedAt ? formatDate(o.expectedAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[o.status]}>
                        {PURCHASE_ORDER_STATUS_LABELS[o.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(o.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/purchases/${o.id}`}>
                              <Eye className="size-4" />
                              مشاهده
                            </Link>
                          </DropdownMenuItem>
                          {canManage && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleting(o)}
                              >
                                <Trash2 className="size-4" />
                                حذف
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PurchaseOrderFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        suppliers={suppliers}
        products={products}
        onSaved={reload}
      />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف سفارش خرید</DialogTitle>
            <DialogDescription>
              مطمئن هستید که سفارش «{deleting?.number}» حذف شود؟ این عمل قابل
              بازگشت نیست.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={busy}>
              انصراف
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
