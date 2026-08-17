"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteInvoiceAction } from "@/actions/invoices";
import { formatCurrency, formatDate } from "@/lib/format";
import type { InvoiceRow } from "@/services/invoices";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  const router = useRouter();

  const filtered = initialData.filter(
    (row) =>
      row.invoice.number.toLowerCase().includes(search.toLowerCase()) ||
      row.contactName.toLowerCase().includes(search.toLowerCase())
  );

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

      <div className="rounded-lg border bg-card">
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
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  فاکتوری یافت نشد
                </TableCell>
              </TableRow>
            )}
            {filtered.map((row) => (
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
    </div>
  );
}
