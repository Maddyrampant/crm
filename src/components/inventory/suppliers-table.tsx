"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Store,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { deleteSupplierAction, listSuppliersAction } from "@/actions/inventory";
import { SupplierFormDialog } from "@/components/inventory/supplier-form-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import type { Supplier } from "@/db/schema";

type Props = {
  initialData: { items: Supplier[]; total: number; page: number; pageSize: number; totalPages: number };
  canManage: boolean;
};

export function SuppliersTable({ initialData, canManage }: Props) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);
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
      const result = await listSuppliersAction({
        search: search || undefined,
        page,
        pageSize,
      });
      setData(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در بارگذاری تأمین‌کننده‌ها");
    }
  }, [search, page, pageSize]);

  useEffect(() => {
    startTransition(() => { load(); });
  }, [load]);

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteSupplierAction(deleting.id);
      toast.success("تأمین‌کننده حذف شد");
      load();
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در حذف تأمین‌کننده");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">تأمین‌کنندگان</CardTitle>
          {canManage && (
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              تأمین‌کننده جدید
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              dir="rtl"
              className="ps-8"
              placeholder="جستجوی نام تأمین‌کننده..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className={isPending || busy ? "relative rounded-lg opacity-60" : "relative rounded-lg"}>
            {data.items.length === 0 && !isPending ? (
              <EmptyState
                icon={Store}
                title="تأمین‌کننده‌ای ثبت نشده است"
                description={
                  canManage
                    ? "اولین تأمین‌کننده را اضافه کنید."
                    : "مدیر فضای کاری، تأمین‌کنندگان را ثبت می‌کند."
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نام</TableHead>
                    <TableHead>شخص تماس</TableHead>
                    <TableHead>موبایل</TableHead>
                    <TableHead>ایمیل</TableHead>
                    <TableHead>آدرس</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.contactName || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground" dir="ltr">
                        {s.phone || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground" dir="ltr">
                        {s.email || "—"}
                      </TableCell>
                      <TableCell className="max-w-48 truncate text-muted-foreground">
                        {s.address || "—"}
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
                                  setEditing(s);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="size-4" />
                                ویرایش
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleting(s)}
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

      <SupplierFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        supplier={editing}
        onSaved={load}
      />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف تأمین‌کننده</DialogTitle>
            <DialogDescription>
              مطمئن هستید که «{deleting?.name}» حذف شود؟ سفارش‌های قبلی
              باقی می‌مانند.
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
