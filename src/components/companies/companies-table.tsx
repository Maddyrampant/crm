"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Pencil,
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
import { showUndoToast } from "@/components/ui/undo-toast";
import { CompanyFormDialog } from "@/components/companies/company-form-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { listCompaniesAction, deleteCompanyAction } from "@/actions/contacts";
import { formatDate, formatNumber } from "@/lib/format";
import type { CompanyRow } from "@/lib/api-types";

type Props = {
  initialData: { items: CompanyRow[]; total: number };
  canManage: boolean;
  canDelete: boolean;
};

export function CompaniesTable({ initialData, canManage, canDelete }: Props) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyRow | null>(null);
  const [deleting, setDeleting] = useState<CompanyRow | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    const result = await listCompaniesAction({
      search: search || undefined,
      page,
      pageSize,
      sortBy: "name",
      sortDir: "asc",
    });
    if (result.ok && result.data) setData(result.data);
  }, [search, page, pageSize]);

  useEffect(() => {
    startTransition(() => {
      load();
    });
  }, [load]);

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    const result = await deleteCompanyAction(deleting.id);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    showUndoToast({
      message: "شرکت حذف شد",
      onUndo: () => load(),
    });
    setData((d) => ({
      items: d.items.filter((c) => c.id !== deleting.id),
      total: Math.max(0, d.total - 1),
    }));
    setDeleting(null);
  }

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">شرکت‌ها</CardTitle>
          {canManage && (
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              شرکت جدید
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              dir="rtl"
              className="ps-8"
              placeholder="جستجوی نام، دامنه یا صنعت..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className={isPending || busy ? "overflow-x-auto rounded-lg opacity-60" : "overflow-x-auto rounded-lg"}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام شرکت</TableHead>
                  <TableHead>صنعت</TableHead>
                  <TableHead>دامنه</TableHead>
                  <TableHead className="text-center">تعداد مشتری</TableHead>
                  <TableHead>تاریخ افزودن</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.length === 0 && !isPending ? (
                  <TableRow>
                    <TableCell colSpan={6} className="border-0">
                      <EmptyState
                        icon={Search}
                        title="شرکتی یافت نشد"
                        description="فیلتر یا جستجو را تغییر دهید یا شرکت جدید بسازید."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link
                          href={`/companies/${c.id}`}
                          className="font-medium hover:underline"
                        >
                          {c.name}
                        </Link>
                        {c.website && (
                          <span className="block text-xs text-muted-foreground" dir="ltr">
                            {c.website}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.industry || "—"}
                      </TableCell>
                      <TableCell dir="ltr" className="text-muted-foreground">
                        {c.domain || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{formatNumber(c.contactCount)}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(c.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canManage && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditing(c);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="size-4" />
                                ویرایش
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDeleting(c)}
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs text-muted-foreground">{formatNumber(data.total)} شرکت</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={page <= 1 || isPending}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronRight className="size-4 ltr:rotate-180" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {formatNumber(page)} / {formatNumber(totalPages)}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={page >= totalPages || isPending}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronLeft className="size-4 ltr:rotate-180" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <CompanyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        company={editing}
        onSaved={(saved) => {
          setData((d) => {
            const exists = d.items.some((c) => c.id === saved.id);
            const items = exists
              ? d.items.map((c) => (c.id === saved.id ? saved : c))
              : [saved, ...d.items];
            return { items, total: exists ? d.total : d.total + 1 };
          });
          load();
        }}
      />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف شرکت</DialogTitle>
            <DialogDescription>
              مطمئن هستید که «{deleting?.name}» حذف شود؟ این عمل قابل بازگشت نیست.
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
