"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteInvoiceAction } from "@/actions/invoices";
import { bulkDeleteInvoicesAction } from "@/actions/bulk";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import type { InvoiceRow } from "@/services/invoices";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceStatusBadge } from "./status-badge";

export function InvoiceList({ initialData }: { initialData: InvoiceRow[] }) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const router = useRouter();

  const filtered = initialData.filter(
    (row) =>
      row.invoice.number.toLowerCase().includes(search.toLowerCase()) ||
      row.contactName.toLowerCase().includes(search.toLowerCase())
  );

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.invoice.id)));
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
    const result = await bulkDeleteInvoicesAction(ids);
    setBulkBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${result.deleted} فاکتور حذف شد`);
    setSelectedIds(new Set());
    router.refresh();
  }

  async function handleDelete(invoiceId: string) {
    if (!confirm("این فاکتور حذف شود؟")) return;
    const result = await deleteInvoiceAction(invoiceId);
    if (result.ok) {
      toast.success("فاکتور حذف شد");
      router.refresh();
    } else {
      toast.error("خطا در حذف");
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="جستجوی شماره یا نام مشتری…"
          className="ps-3 pe-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>شماره</TableHead>
              <TableHead>مشتری</TableHead>
              <TableHead>تاریخ</TableHead>
              <TableHead>سررسید</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead className="text-left">مبلغ</TableHead>
              <TableHead>پرداخت‌شده</TableHead>
              <TableHead className="text-left">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  فاکتوری یافت نشد
                </TableCell>
              </TableRow>
            )}
            {filtered.map((row) => (
              <TableRow key={row.invoice.id} className={selectedIds.has(row.invoice.id) ? "bg-muted/50" : ""}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(row.invoice.id)}
                    onCheckedChange={() => toggleSelect(row.invoice.id)}
                  />
                </TableCell>
                <TableCell className="font-medium" dir="ltr">
                  {row.invoice.number}
                </TableCell>
                <TableCell>{row.contactName}</TableCell>
                <TableCell>{formatDate(row.invoice.issuedAt)}</TableCell>
                <TableCell>{formatDate(row.invoice.dueAt)}</TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={row.invoice.status} />
                </TableCell>
                <TableCell className="text-left tabular-nums">
                  {formatCurrency(row.invoice.total)}
                </TableCell>
                <TableCell className="text-left tabular-nums">
                  {formatCurrency(row.paidTotal)}
                </TableCell>
                <TableCell className="text-left">
                  <div className="flex justify-end gap-1">
                    <Button asChild size="icon" variant="ghost" title="مشاهده">
                      <Link href={`/invoices/${row.invoice.id}`}>
                        <Eye className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="حذف"
                      onClick={() => handleDelete(row.invoice.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
    </div>
  );
}
