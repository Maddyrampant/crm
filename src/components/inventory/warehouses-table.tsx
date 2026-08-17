"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Warehouse as WarehouseIcon,
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
import { deleteWarehouseAction, listWarehousesAction } from "@/actions/inventory";
import { WarehouseFormDialog } from "@/components/inventory/warehouse-form-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNumber } from "@/lib/format";
import type { WarehouseWithCount } from "@/lib/inventory";

type Props = {
  initialData: { items: WarehouseWithCount[]; total: number; page: number; pageSize: number; totalPages: number };
  canManage: boolean;
};

export function WarehousesTable({ initialData, canManage }: Props) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseWithCount | null>(null);
  const [deleting, setDeleting] = useState<WarehouseWithCount | null>(null);
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
      const result = await listWarehousesAction({
        search: search || undefined,
        page,
        pageSize,
      });
      setData(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در بارگذاری انبارها");
    }
  }, [search, page, pageSize]);

  useEffect(() => {
    startTransition(() => { load(); });
  }, [load]);

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteWarehouseAction(deleting.id);
      toast.success("انبار حذف شد");
      load();
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در حذف انبار");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">انبارها</CardTitle>
          {canManage && (
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              انبار جدید
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              dir="rtl"
              className="ps-8"
              placeholder="جستجوی نام انبار..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className={isPending || busy ? "relative rounded-lg opacity-60" : "relative rounded-lg"}>
            {data.items.length === 0 && !isPending ? (
              <EmptyState
                icon={WarehouseIcon}
                title="انباری ساخته نشده است"
                description={
                  canManage
                    ? "اولین انبار خود را بسازید تا بتوانید موجودی را مدیریت کنید."
                    : "مدیر فضای کاری، انبارها را می‌سازد."
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>انبار</TableHead>
                    <TableHead>کد</TableHead>
                    <TableHead>موقعیت</TableHead>
                    <TableHead className="text-end">تعداد کالا</TableHead>
                    <TableHead>نوع</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <WarehouseIcon className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="block truncate font-medium">
                              {w.name}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground" dir="ltr">
                        {w.code || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {w.location || "—"}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatNumber(w.productCount)}
                      </TableCell>
                      <TableCell>
                        {w.isDefault ? (
                          <Badge variant="default">پیش‌فرض</Badge>
                        ) : (
                          <Badge variant={w.active ? "outline" : "secondary"}>
                            {w.active ? "فعال" : "غیرفعال"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditing(w);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="size-4" />
                                ویرایش
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleting(w)}
                              >
                                <Trash2 className="size-4" />
                                حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
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

      <WarehouseFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        warehouse={editing}
        onSaved={load}
      />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف انبار</DialogTitle>
            <DialogDescription>
              مطمئن هستید که انبار «{deleting?.name}» حذف شود؟ این عمل قابل
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
