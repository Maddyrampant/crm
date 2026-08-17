"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowUpDown,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Package,
  Search,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { listProductsAction, listLowStockAction, getProductAction } from "@/actions/inventory";
import { EmptyState } from "@/components/ui/empty-state";
import {
  STOCK_MOVEMENT_TYPE_LABELS,
  type StockMovementType,
} from "@/lib/inventory";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { ProductWithStock } from "@/lib/inventory";

type Props = {
  initialData: { items: ProductWithStock[]; total: number };
  lowStockIds: string[];
};

const PAGE_SIZE = 20;

type ProductDetail = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  categoryName?: string | null;
  totalStock: number;
  stock: {
    id: string;
    quantity: number;
    reorderLevel: string | null;
    warehouseName: string | null;
  }[];
  movements: {
    id: string;
    type: StockMovementType;
    quantity: string;
    reference: string | null;
    notes: string | null;
    createdAt: Date;
  }[];
};

const MOVEMENT_VARIANT: Record<
  StockMovementType,
  "outline" | "default" | "secondary" | "destructive"
> = {
  opening: "secondary",
  purchase: "default",
  sale: "destructive",
  transfer: "outline",
  adjustment: "secondary",
  return: "outline",
};

export function StockTable({ initialData, lowStockIds }: Props) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"totalStock" | "name">("totalStock");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [data, setData] = useState(initialData);
  const [lowSet, setLowSet] = useState<Set<string>>(new Set(lowStockIds));
  const [isPending, startTransition] = useTransition();

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    try {
      if (lowOnly) {
        const low = await listLowStockAction();
        setLowSet(new Set(low.map((p) => p.id)));
        const q = search.trim().toLowerCase();
        const filtered = q
          ? low.filter((p) => p.name.toLowerCase().includes(q))
          : low;
        setData({ items: filtered, total: filtered.length });
      } else {
        const result = await listProductsAction({
          search: search || undefined,
          page,
        });
        setData(result);
        const low = await listLowStockAction();
        setLowSet(new Set(low.map((p) => p.id)));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در بارگذاری موجودی");
    }
  }, [search, page, lowOnly]);

  useEffect(() => {
    startTransition(() => {
      load();
    });
  }, [load]);

  const sortedItems = useMemo(() => {
    const items = [...data.items];
    items.sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
      if (typeof valA === "number" && typeof valB === "number") {
        return sortDir === "asc" ? valA - valB : valB - valA;
      }
      const cmp = String(valA ?? "").localeCompare(String(valB ?? ""), "fa");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return items;
  }, [data.items, sortBy, sortDir]);

  function toggleSort(col: "totalStock" | "name") {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  }

  async function openDetail(productId: string) {
    setDetailId(productId);
    setDetail(null);
    setLoadingDetail(true);
    try {
      const result = await getProductAction(productId);
      setDetail(result as unknown as ProductDetail);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در بارگذاری جزئیات");
    } finally {
      setLoadingDetail(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">موجودی کالاها</CardTitle>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={lowOnly}
                onCheckedChange={(v) => {
                  setLowOnly(v === true);
                  setPage(1);
                }}
              />
              فقط کم‌موجود
            </label>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              dir="rtl"
              className="ps-8"
              placeholder="جستجوی کالا..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div
            className={
              isPending ? "relative rounded-lg opacity-60" : "relative rounded-lg"
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    <span className="inline-flex items-center gap-1">
                      کالا
                      {sortBy === "name" && <ArrowUpDown className="size-3.5" />}
                    </span>
                  </TableHead>
                  <TableHead>دسته‌بندی</TableHead>
                  <TableHead className="cursor-pointer select-none text-end" onClick={() => toggleSort("totalStock")}>
                    <span className="inline-flex items-center gap-1">
                      موجودی کل
                      {sortBy === "totalStock" && <ArrowUpDown className="size-3.5" />}
                    </span>
                  </TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.length === 0 && !isPending ? (
                  <TableRow>
                    <TableCell colSpan={5} className="border-0">
                      <EmptyState
                        icon={lowOnly ? AlertTriangle : Boxes}
                        title={lowOnly ? "کالای کم‌موجودی نیست" : "کالایی یافت نشد"}
                        description={
                          lowOnly
                            ? "همهٔ کالاها بالای نقطهٔ سفارش مجدد هستند."
                            : "فیلتر یا جستجو را تغییر دهید."
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                    sortedItems.map((p) => {
                    const isLow = lowSet.has(p.id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="min-w-0">
                            <span className="block truncate font-medium">
                              {p.name}
                            </span>
                            <span
                              className="block truncate text-xs text-muted-foreground"
                              dir="ltr"
                            >
                              {p.sku || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.categoryName || "—"}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatNumber(p.totalStock)} {p.unit}
                        </TableCell>
                        <TableCell>
                          {isLow ? (
                            <Badge variant="destructive">
                              <AlertTriangle className="size-3" />
                              کم‌موجود
                            </Badge>
                          ) : (
                            <Badge variant="outline">کافی</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openDetail(p.id)}
                          >
                            <Eye className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {!lowOnly && (
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
          )}
        </CardContent>
      </Card>

      <Dialog
        open={detailId !== null}
        onOpenChange={(o) => !o && setDetailId(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {detail ? (
                <>
                  {detail.name}
                  <span className="mt-1 block text-sm font-normal text-muted-foreground">
                    {detail.sku || "—"} • {detail.unit} •{" "}
                    {detail.categoryName || "بدون دسته‌بندی"}
                  </span>
                </>
              ) : (
                "جزئیات کالا"
              )}
            </DialogTitle>
            <DialogDescription>
              سطح موجودی در هر انبار و گردش اخیر.
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : detail ? (
            <div className="grid gap-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm text-muted-foreground">موجودی کل</span>
                <span className="text-lg font-bold tabular-nums">
                  {formatNumber(detail.totalStock)} {detail.unit}
                </span>
              </div>

              <div className="grid gap-2">
                <h3 className="text-sm font-semibold">سطح هر انبار</h3>
                {detail.stock.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    در هیچ انباری موجودی ثبت نشده است.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>انبار</TableHead>
                        <TableHead className="text-end">موجودی</TableHead>
                        <TableHead className="text-end">نقطهٔ سفارش</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.stock.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.warehouseName || "—"}</TableCell>
                          <TableCell className="text-end tabular-nums">
                            {formatNumber(s.quantity)} {detail.unit}
                          </TableCell>
                          <TableCell className="text-end tabular-nums">
                            {s.reorderLevel
                              ? `${formatNumber(Number(s.reorderLevel))} ${detail.unit}`
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="grid gap-2">
                <h3 className="text-sm font-semibold">گردش اخیر</h3>
                {detail.movements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    گردشی ثبت نشده است.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>نوع</TableHead>
                        <TableHead className="text-end">تعداد</TableHead>
                        <TableHead>مرجع</TableHead>
                        <TableHead>تاریخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.movements.map((m) => {
                        const qty = Number(m.quantity);
                        return (
                          <TableRow key={m.id}>
                            <TableCell>
                              <Badge variant={MOVEMENT_VARIANT[m.type]}>
                                {STOCK_MOVEMENT_TYPE_LABELS[m.type]}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className={
                                qty >= 0
                                  ? "text-end font-medium tabular-nums text-emerald-600"
                                  : "text-end font-medium tabular-nums text-red-500"
                              }
                            >
                              {qty >= 0 ? "+" : ""}
                              {formatNumber(qty)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground" dir="ltr">
                              {m.reference || m.notes || "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDateTime(m.createdAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Package className="size-6 text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
