"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteInvoiceAction, listInvoicesAction } from "@/actions/invoices";
import { formatCurrency, formatDate, toFaDigits } from "@/lib/format";
import type { InvoiceRow } from "@/services/invoices";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceStatusBadge } from "./status-badge";

export function InvoiceList({
  initialData,
  initialTotal,
  workspaceId,
}: {
  initialData: InvoiceRow[];
  initialTotal: number;
  workspaceId: string;
}) {
  const [items, setItems] = useState(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pageSize = 20;

  const fetchPage = useCallback(
    (p: number, q: string) => {
      startTransition(async () => {
        const result = await listInvoicesAction({ page: p, pageSize, search: q || undefined });
        setItems(result.items);
        setTotal(result.total);
      });
    },
    [pageSize]
  );

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
    fetchPage(1, value);
  }

  function handlePageChange(p: number) {
    setPage(p);
    fetchPage(p, search);
  }

  async function handleDelete(invoiceId: string) {
    if (!confirm("این فاکتور حذف شود؟")) return;
    const result = await deleteInvoiceAction(invoiceId);
    if (result.ok) {
      toast.success("فاکتور حذف شد");
      fetchPage(page, search);
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
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
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
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  {isPending ? "در حال بارگذاری…" : "فاکتوری یافت نشد"}
                </TableCell>
              </TableRow>
            )}
            {items.map((row) => (
              <TableRow key={row.invoice.id}>
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

      {total > pageSize && (
        <PaginationControls
          page={page}
          total={total}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={() => {}}
        />
      )}
    </div>
  );
}
