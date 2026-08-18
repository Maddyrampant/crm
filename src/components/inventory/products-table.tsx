"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Search,
  Tags,
  Trash2,
} from "lucide-react";
import { nextSortDirection, type ColumnSort } from "@/lib/sort";
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
import {
  listProductsAction,
  deleteProductAction,
  listProductCategoriesAction,
} from "@/actions/inventory";
import { showUndoToast } from "@/components/ui/undo-toast";
import { ProductFormDialog } from "@/components/inventory/product-form-dialog";
import { CategoryManagerDialog } from "@/components/inventory/category-manager-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PRODUCT_ACTIVE_LABEL } from "@/lib/inventory";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { CategoryWithCount, ProductWithStock } from "@/lib/inventory";

type Props = {
  initialData: { items: ProductWithStock[]; total: number };
  categories: CategoryWithCount[];
  canManage: boolean;
};

const PAGE_SIZE = 20;

export function ProductsTable({ initialData, categories, canManage }: Props) {
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<{
    search: string;
    categoryId: string;
    active: string;
  }>({ search: "", categoryId: "all", active: "all" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(initialData);
  const [categoryList, setCategoryList] = useState(categories);
  const [isPending, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductWithStock | null>(null);
  const [deleting, setDeleting] = useState<ProductWithStock | null>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState<ColumnSort | null>(null);

  function toggleSort(col: string) {
    setSort((prev) => ({
      column: col,
      direction: prev?.column === col ? nextSortDirection(prev.direction) : "asc",
    }));
    setPage(1);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput }));
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    try {
      const result = await listProductsAction({
        search: filters.search || undefined,
        categoryId: filters.categoryId === "all" ? undefined : filters.categoryId,
        active: filters.active === "all" ? undefined : (filters.active as "active" | "inactive"),
        page,
        sortBy: sort?.column as any,
        sortDir: sort?.direction,
      });
      setData(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در بارگذاری کالاها");
    }
  }, [filters, page, sort]);

  useEffect(() => {
    startTransition(() => {
      load();
    });
  }, [load]);

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteProductAction(deleting.id);
      showUndoToast({
        message: "کالا حذف شد",
        onUndo: () => load(),
      });
      setData((d) => ({
        items: d.items.filter((p) => p.id !== deleting.id),
        total: Math.max(0, d.total - 1),
      }));
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در حذف کالا");
    }
    setBusy(false);
  }

  async function refreshCategories() {
    try {
      const result = await listProductCategoriesAction();
      setCategoryList(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در بارگذاری دسته‌بندی‌ها");
    }
  }

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">کالاها</CardTitle>
          {canManage && (
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              کالای جدید
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
                placeholder="جستجوی نام، کد یا بارکد..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Select
              value={filters.categoryId}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, categoryId: v }));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="دسته‌بندی" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه دسته‌بندی‌ها</SelectItem>
                {categoryList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.active}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, active: v }));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="وضعیت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="inactive">غیرفعال</SelectItem>
              </SelectContent>
            </Select>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCategoryManagerOpen(true)}
              >
                <Tags className="size-4" />
                دسته‌بندی‌ها
              </Button>
            )}
          </div>

          <div
            className={
              isPending || busy
                ? "overflow-x-auto relative rounded-lg opacity-60"
                : "overflow-x-auto relative rounded-lg"
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button onClick={() => toggleSort("name")} className="inline-flex items-center gap-1 hover:text-foreground">
                      کالا
                      <ArrowUpDown className="size-3" />
                    </button>
                  </TableHead>
                  <TableHead>دسته‌بندی</TableHead>
                  <TableHead>واحد</TableHead>
                  <TableHead className="text-end">
                    <button onClick={() => toggleSort("unitPrice")} className="inline-flex items-center gap-1 hover:text-foreground">
                      قیمت فروش
                      <ArrowUpDown className="size-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-end">
                    <button onClick={() => toggleSort("totalStock")} className="inline-flex items-center gap-1 hover:text-foreground">
                      موجودی کل
                      <ArrowUpDown className="size-3" />
                    </button>
                  </TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.length === 0 && !isPending ? (
                  <TableRow>
                    <TableCell colSpan={7} className="border-0">
                      <EmptyState
                        icon={Package}
                        title="کالایی یافت نشد"
                        description="فیلتر یا جستجو را تغییر دهید یا کالای جدید بسازید."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <span className="block truncate font-medium">
                            {p.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground" dir="ltr">
                            {p.barcode || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.categoryName || "—"}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {p.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatCurrency(p.unitPrice)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatNumber(p.totalStock)} {p.unit}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.active ? "default" : "outline"}>
                          {PRODUCT_ACTIVE_LABEL[p.active ? "active" : "inactive"]}
                        </Badge>
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
                                  setEditing(p);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="size-4" />
                                ویرایش
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleting(p)}
                              >
                                <Trash2 className="size-4" />
                                حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs text-muted-foreground">
              {formatNumber(data.total)} کالا
            </p>
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

      <ProductFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        categories={categoryList}
        onSaved={async () => {
          await refreshCategories();
          load();
        }}
      />

      <CategoryManagerDialog
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        categories={categoryList}
        onChanged={refreshCategories}
      />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف کالا</DialogTitle>
            <DialogDescription>
              مطمئن هستید که «{deleting?.name}» حذف شود؟ این عمل قابل بازگشت
              نیست.
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
