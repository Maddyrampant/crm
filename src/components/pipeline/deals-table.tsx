"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Search,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Trophy,
} from "lucide-react";
import { nextSortDirection, type ColumnSort } from "@/lib/sort";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JalaliDateInput } from "@/components/ui/jalali-date-input";
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
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { Checkbox } from "@/components/ui/checkbox";
import {
  deleteDealAction,
  listDealsAction,
  setDealOutcomeAction,
} from "@/actions/deals";
import { bulkDeleteDealsAction } from "@/actions/bulk";
import { STATUS_LABELS } from "@/lib/labels";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import type { DealRow, PipelineRow } from "@/lib/api-types";
import type { WorkspaceMemberRow } from "@/services/workspace";

type Props = {
  initialData: { items: DealRow[]; total: number };
  pipelines: PipelineRow[];
  members: WorkspaceMemberRow[];
  canManageDeal: boolean;
  canDelete: boolean;
};

type Filters = {
  search: string;
  pipelineId: string;
  stageId: string;
  status: string;
  ownerId: string;
  closeDateFrom: string;
  closeDateTo: string;
};

const EMPTY_FILTERS: Filters = {
  search: "",
  pipelineId: "all",
  stageId: "all",
  status: "all",
  ownerId: "all",
  closeDateFrom: "",
  closeDateTo: "",
};

const STATUS_VARIANT: Record<
  DealRow["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  open: "secondary",
  won: "default",
  lost: "destructive",
};

export function DealsTable({
  initialData,
  pipelines,
  members,
  canManageDeal,
  canDelete,
}: Props) {
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const [outcomeDeal, setOutcomeDeal] = useState<DealRow | null>(null);
  const [outcome, setOutcome] = useState<"won" | "lost" | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [deleting, setDeleting] = useState<DealRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState<ColumnSort | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

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

  const selectedPipeline = useMemo(
    () => pipelines.find((p) => p.id === filters.pipelineId) ?? null,
    [pipelines, filters.pipelineId]
  );

  const load = useCallback(async () => {
    const result = await listDealsAction({
      search: filters.search || undefined,
      pipelineId: filters.pipelineId === "all" ? null : filters.pipelineId,
      stageId: filters.stageId === "all" ? null : filters.stageId,
      status: filters.status === "all" ? null : filters.status,
      ownerId: filters.ownerId === "all" ? null : filters.ownerId,
      closeDateFrom: filters.closeDateFrom || null,
      closeDateTo: filters.closeDateTo || null,
      page,
      pageSize,
      sortBy: sort?.column as any,
      sortDir: sort?.direction,
    });
    if (result.ok && result.data) setData(result.data);
  }, [filters, page, pageSize, sort]);

  useEffect(() => {
    startTransition(() => {
      load();
    });
  }, [load]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
    if (key === "pipelineId") setFilters((f) => ({ ...f, stageId: "all" }));
  }

  async function handleOutcome() {
    if (!outcomeDeal || !outcome) return;
    setBusy(true);
    const result = await setDealOutcomeAction(
      outcomeDeal.id,
      outcome,
      outcome === "lost" ? (lostReason.trim() || null) : null
    );
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(outcome === "won" ? "فروش برنده شد" : "فروش باخته شد");
    setOutcomeDeal(null);
    setOutcome(null);
    setLostReason("");
    load();
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    const result = await deleteDealAction(deleting.id);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("فروش حذف شد");
    setData((d) => ({
      items: d.items.filter((x) => x.id !== deleting.id),
      total: Math.max(0, d.total - 1),
    }));
    setDeleting(null);
  }

  function toggleSelectAll() {
    if (selectedIds.size === data.items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.items.map((d) => d.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setBulkBusy(true);
    const result = await bulkDeleteDealsAction(ids);
    setBulkBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${result.deleted} فروش حذف شد`);
    setSelectedIds(new Set());
    load();
  }

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">لیست فروش‌ها</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                dir="rtl"
                className="ps-8"
                placeholder="جستجوی عنوان، مشتری یا شرکت..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Select
              value={filters.pipelineId}
              onValueChange={(v) => updateFilter("pipelineId", v)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="فانل فروش" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه فانل‌ها</SelectItem>
                {pipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.stageId}
              onValueChange={(v) => updateFilter("stageId", v)}
              disabled={!selectedPipeline}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="مرحله" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه مراحل</SelectItem>
                {selectedPipeline?.stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.status}
              onValueChange={(v) => updateFilter("status", v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="وضعیت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.ownerId}
              onValueChange={(v) => updateFilter("ownerId", v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="مسئول" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه مسئول‌ها</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex w-full flex-wrap items-center gap-1 sm:w-auto">
              <JalaliDateInput
                className="w-full min-w-0 flex-1 sm:w-40 sm:flex-none"
                aria-label="تاریخ بستن از"
                value={filters.closeDateFrom}
                onChange={(v) => updateFilter("closeDateFrom", v ?? "")}
              />
              <span className="text-xs text-muted-foreground">تا</span>
              <JalaliDateInput
                className="w-full min-w-0 flex-1 sm:w-40 sm:flex-none"
                aria-label="تاریخ بستن تا"
                value={filters.closeDateTo}
                onChange={(v) => updateFilter("closeDateTo", v ?? "")}
              />
            </div>
          </div>

          <div className={isPending || busy ? "relative rounded-lg opacity-60" : "relative rounded-lg"}>
            <Table>
              <TableHeader>
                <TableRow>
                  {canDelete && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={data.items.length > 0 && selectedIds.size === data.items.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>
                    <button onClick={() => toggleSort("title")} className="inline-flex items-center gap-1 hover:text-foreground">
                      عنوان
                      <ArrowUpDown className="size-3" />
                    </button>
                  </TableHead>
                  <TableHead>مشتری</TableHead>
                  <TableHead>شرکت</TableHead>
                  <TableHead>مرحله</TableHead>
                  <TableHead>مسئول</TableHead>
                  <TableHead>
                    <button onClick={() => toggleSort("amount")} className="inline-flex items-center gap-1 hover:text-foreground">
                      مبلغ
                      <ArrowUpDown className="size-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => toggleSort("closeDate")} className="inline-flex items-center gap-1 hover:text-foreground">
                      تاریخ بستن
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
                    <TableCell colSpan={canDelete ? 10 : 9} className="border-0">
                      <EmptyState
                        icon={Trophy}
                        title="فروشی یافت نشد"
                        description="فیلترها را تغییر دهید یا از فانل فروش یک فروش جدید بسازید."
                      >
                        <Button asChild variant="outline" size="sm">
                          <Link href="/pipeline">
                            <ExternalLink className="size-4 rtl:-scale-x-100" />
                            رفتن به فانل فروش
                          </Link>
                        </Button>
                      </EmptyState>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((d) => (
                    <TableRow key={d.id} className={selectedIds.has(d.id) ? "bg-muted/50" : ""}>
                      {canDelete && (
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(d.id)}
                            onCheckedChange={() => toggleSelect(d.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="min-w-0">
                          <Link
                            href="/pipeline"
                            className="block truncate font-medium hover:underline"
                          >
                            {d.title}
                          </Link>
                          {d.closeDate ? (
                            <span className="block text-xs text-muted-foreground">
                              بستن: {formatDate(d.closeDate)}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {d.contactId ? (
                          <Link
                            href={`/contacts/${d.contactId}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {`${d.contactName ?? ""} ${d.contactLastName ?? ""}`.trim() ||
                              "—"}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {d.companyName || "—"}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: d.stageColor ?? "#888" }}
                          />
                          <span className="text-sm">{d.stageName || "—"}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {d.ownerName || "—"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(d.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {d.closeDate ? formatDate(d.closeDate) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[d.status]}>
                          {STATUS_LABELS[d.status]}
                        </Badge>
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
                              <Link href="/pipeline">
                                <ExternalLink className="size-4 rtl:-scale-x-100" />
                                نمایش در فانل
                              </Link>
                            </DropdownMenuItem>
                            {canManageDeal && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  disabled={d.status === "won"}
                                  onClick={() => {
                                    setOutcome("won");
                                    setOutcomeDeal(d);
                                  }}
                                >
                                  <ThumbsUp className="size-4" />
                                  ثبت برد
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={d.status === "lost"}
                                  onClick={() => {
                                    setOutcome("lost");
                                    setLostReason("");
                                    setOutcomeDeal(d);
                                  }}
                                >
                                  <ThumbsDown className="size-4" />
                                  ثبت باخت
                                </DropdownMenuItem>
                              </>
                            )}
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDeleting(d)}
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
            <p className="text-xs text-muted-foreground">
              {formatNumber(data.total)} فروش
            </p>
            <div className="flex items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger size="sm" className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {formatNumber(n)} در هر صفحه
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {selectedIds.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {formatNumber(selectedIds.size)} مورد انتخاب شده
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkBusy}
            >
              {bulkBusy && <Loader2 className="size-4 animate-spin" />}
              حذف گروهی
            </Button>
          </div>
        </div>
      )}

      <Dialog
        onOpenChange={(o) => {
          if (!o) {
            setOutcomeDeal(null);
            setOutcome(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {outcome === "won" ? "ثبت برد فروش" : "ثبت باخت فروش"}
            </DialogTitle>
            <DialogDescription>
              {outcome === "won"
                ? `«${outcomeDeal?.title}» برنده شد و از فانل خارج می‌شود.`
                : `دلیل باخت «${outcomeDeal?.title}» را ثبت کنید.`}
            </DialogDescription>
          </DialogHeader>
          {outcome === "lost" && (
            <Textarea
              dir="rtl"
              rows={3}
              placeholder="دلیل باخت (اختیاری)..."
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
            />
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOutcomeDeal(null);
                setOutcome(null);
              }}
              disabled={busy}
            >
              انصراف
            </Button>
            <Button
              variant={outcome === "won" ? "default" : "destructive"}
              onClick={handleOutcome}
              disabled={busy}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              تایید
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف فروش</DialogTitle>
            <DialogDescription>
              مطمئن هستید که «{deleting?.title}» حذف شود؟ این عمل قابل بازگشت
              نیست.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleting(null)}
              disabled={busy}
            >
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
