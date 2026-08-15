"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  Eye,
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
  getContactsAction,
  deleteContactAction,
  exportContactsCsvAction,
} from "@/actions/contacts";
import { ContactFormDialog } from "@/components/contacts/contact-form-dialog";
import { SOURCE_LABELS, STAGE_LABELS, STAGE_VARIANT } from "@/lib/labels";
import { formatDate, formatNumber } from "@/lib/format";
import type { ContactRow, CustomFieldRow, TagRow } from "@/lib/api-types";
import type { WorkspaceMemberRow } from "@/services/workspace";

type Props = {
  initialData: { items: ContactRow[]; total: number };
  companies: { id: string; name: string }[];
  tags: TagRow[];
  members: WorkspaceMemberRow[];
  customFields: CustomFieldRow[];
  canManage: boolean;
  canDelete: boolean;
};

type Filters = {
  search: string;
  lifecycleStage: string;
  source: string;
  ownerId: string;
  tagId: string;
};

const EMPTY_FILTERS: Filters = {
  search: "",
  lifecycleStage: "all",
  source: "all",
  ownerId: "all",
  tagId: "all",
};

export function ContactsTable({
  initialData,
  companies,
  tags,
  members,
  customFields,
  canManage,
  canDelete,
}: Props) {
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<"firstName" | "createdAt" | "updatedAt">(
    "firstName"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContactRow | null>(null);
  const [deleting, setDeleting] = useState<ContactRow | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput }));
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    const result = await getContactsAction({
      ...filters,
      search: filters.search || undefined,
      lifecycleStage: filters.lifecycleStage === "all" ? null : filters.lifecycleStage,
      source: filters.source === "all" ? null : filters.source,
      ownerId: filters.ownerId === "all" ? null : filters.ownerId,
      tagId: filters.tagId === "all" ? null : filters.tagId,
      page,
      pageSize,
      sortBy,
      sortDir,
    });
    if (result.ok && result.data) setData(result.data);
  }, [filters, page, pageSize, sortBy, sortDir]);

  useEffect(() => {
    startTransition(() => {
      load();
    });
  }, [load]);

  function toggleSort(col: "firstName" | "createdAt") {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
    setPage(1);
  }

  async function handleExport() {
    const result = await exportContactsCsvAction({
      search: filters.search || undefined,
      lifecycleStage: filters.lifecycleStage === "all" ? null : filters.lifecycleStage,
      source: filters.source === "all" ? null : filters.source,
      ownerId: filters.ownerId === "all" ? null : filters.ownerId,
      tagId: filters.tagId === "all" ? null : filters.tagId,
    });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const blob = new Blob([result.data ?? ""], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("خروجی CSV دانلود شد");
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    const result = await deleteContactAction(deleting.id);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("مشتری حذف شد");
    setData((d) => ({
      items: d.items.filter((c) => c.id !== deleting.id),
      total: Math.max(0, d.total - 1),
    }));
    setDeleting(null);
  }

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));

  const sortIndicator = () => (
    <ChevronsUpDown className="size-3.5 text-muted-foreground" />
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">مشتریان و سرنخ‌ها</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="size-4" />
              خروجی CSV
            </Button>
            {canManage && (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" />
                مشتری جدید
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                dir="rtl"
                className="ps-8"
                placeholder="جستجوی نام، ایمیل یا موبایل..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Select
              value={filters.lifecycleStage}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, lifecycleStage: v }));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="مرحله" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه مراحل</SelectItem>
                {Object.entries(STAGE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.source}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, source: v }));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="منبع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه منابع</SelectItem>
                {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.ownerId}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, ownerId: v }));
                setPage(1);
              }}
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
            <Select
              value={filters.tagId}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, tagId: v }));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="برچسب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه برچسب‌ها</SelectItem>
                {tags.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className={
              isPending || busy
                ? "relative rounded-lg opacity-60"
                : "relative rounded-lg"
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("firstName")}>
                    <span className="inline-flex items-center gap-1">
                      نام {sortBy === "firstName" && sortIndicator()}
                    </span>
                  </TableHead>
                  <TableHead>شرکت</TableHead>
                  <TableHead>منبع</TableHead>
                  <TableHead>مرحله</TableHead>
                  <TableHead>برچسب‌ها</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("createdAt")}>
                    <span className="inline-flex items-center gap-1">
                      تاریخ افزودن {sortBy === "createdAt" && sortIndicator()}
                    </span>
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.length === 0 && !isPending ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      مشتری‌ای یافت نشد.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary">
                            {c.firstName.charAt(0)}
                            {c.lastName ? c.lastName.charAt(0) : ""}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/contacts/${c.id}`}
                              className="block truncate font-medium hover:underline"
                            >
                              {c.firstName} {c.lastName}
                            </Link>
                            <span className="block truncate text-xs text-muted-foreground" dir="ltr">
                              {c.email || c.phone || "—"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.companyName || "—"}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {SOURCE_LABELS[c.source]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STAGE_VARIANT[c.lifecycleStage]}>
                          {STAGE_LABELS[c.lifecycleStage]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {c.tags.slice(0, 2).map((t) => (
                            <Badge
                              key={t.id}
                              variant="outline"
                              style={{ borderColor: t.color, color: t.color }}
                            >
                              {t.name}
                            </Badge>
                          ))}
                          {c.tags.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{c.tags.length - 2}
                            </span>
                          )}
                        </div>
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
                            <DropdownMenuItem asChild>
                              <Link href={`/contacts/${c.id}`}>
                                <Eye className="size-4" />
                                مشاهده
                              </Link>
                            </DropdownMenuItem>
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
            <p className="text-xs text-muted-foreground">
              {formatNumber(data.total)} مشتری
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
                      {n} در هر صفحه
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

      <ContactFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={editing}
        companies={companies}
        members={members}
        customFields={customFields}
        onSaved={(saved) => {
          setData((d) => {
            const exists = d.items.some((c) => c.id === saved.id);
            const items = exists
              ? d.items.map((c) => (c.id === saved.id ? saved : c))
              : [saved, ...d.items];
            return {
              items,
              total: exists ? d.total : d.total + 1,
            };
          });
          load();
        }}
      />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف مشتری</DialogTitle>
            <DialogDescription>
              مطمئن هستید که «{deleting?.firstName} {deleting?.lastName}» حذف شود؟
              این عمل قابل بازگشت نیست.
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
