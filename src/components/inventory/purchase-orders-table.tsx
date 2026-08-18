"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ClipboardList,
  Eye,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { PaginationControls } from "@/components/ui/pagination-controls";
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
  initialData: { items: (PurchaseOrder & { supplierName: string | null; itemCount: number })[]; total: number; page: number; pageSize: number; totalPages: number };
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
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<PurchaseOrder | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    try {
      const result = await listPurchaseOrdersAction({
        search: search || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        page,
        pageSize,
      });
      setData(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در بارگذاری سفارش‌ها");
    }
  }, [search, statusFilter, page, pageSize]);

  useEffect(() => {
    startTransition(() => { load(); });
  }, [load]);

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await deletePurchaseOrderAction(deleting.id);
      toast.success("سفارش حذف شد");
      load();
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
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                dir="rtl"
                className="ps-8"
                placeholder="جستجوی شماره سفارش یا تأمین‌کننده..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="وضعیت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                {Object.entries(PURCHASE_ORDER_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={isPending || busy ? "overflow-x-auto relative rounded-lg opacity-60" : "overflow-x-auto relative rounded-lg"}>
            {data.items.length === 0 && !isPending ? (
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
                  {data.items.map((o) => (
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
          </div>

          {data.total > 0 && (
            <PaginationControls
              page={data.page}
              total={data.total}
              pageSize={data.pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            />
          )}
        </CardContent>
      </Card>

      <PurchaseOrderFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        suppliers={suppliers}
        products={products}
        onSaved={load}
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
