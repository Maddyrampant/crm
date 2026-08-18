"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowLeftRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { convertQuoteToInvoiceAction } from "@/actions/quotes";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Quote, QuoteItem } from "@/db/schema";

const statusMap: Record<Quote["status"], { label: string; className: string }> = {
  draft: { label: "پیش‌نویس", className: "bg-muted text-muted-foreground" },
  sent: {
    label: "ارسال‌شده",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  accepted: {
    label: "تأییدشده",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  rejected: {
    label: "ردشده",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
  expired: {
    label: "منقضی",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  },
};

type QuoteData = Quote & { items: QuoteItem[] };

export function QuoteDetail({ data }: { data: QuoteData }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const s = statusMap[data.status];

  async function handleConvert() {
    if (!confirm("این پیشنهاد به فاکتور تبدیل شود؟")) return;
    setLoading(true);
    const result = await convertQuoteToInvoiceAction(data.id);
    setLoading(false);
    if (result.ok && result.data) {
      toast.success("پیشنهاد به فاکتور تبدیل شد");
      router.push(`/invoices/${result.data.id}`);
    } else {
      toast.error("خطا در تبدیل");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-xl font-bold" dir="ltr">
              {data.number}
            </h1>
            <Badge className={s.className}>{s.label}</Badge>
          </div>
        </div>
        {data.status !== "accepted" && data.status !== "rejected" && (
          <Button onClick={handleConvert} disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <ArrowLeftRight className="size-4" />
            )}
            تبدیل به فاکتور
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">اطلاعات</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-1 text-sm">
            <span className="text-muted-foreground">تاریخ ایجاد</span>
            <span>{formatDate(data.createdAt)}</span>
            <span className="text-muted-foreground">سررسید</span>
            <span>{formatDate(data.validUntil)}</span>
            <span className="text-muted-foreground">مالیات کلی</span>
            <span>٪{data.taxRate}</span>
            <span className="text-muted-foreground">مبلغ کل</span>
            <span className="font-bold">{formatCurrency(data.total)}</span>
          </CardContent>
        </Card>
        {data.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">یادداشت</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{data.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">آیتم‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>شرح</TableHead>
                <TableHead className="text-center">تعداد</TableHead>
                <TableHead className="text-left">قیمت واحد</TableHead>
                <TableHead className="text-center">مالیات</TableHead>
                <TableHead className="text-left">جمع</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">
                    {it.description}
                  </TableCell>
                  <TableCell className="text-center">{it.quantity}</TableCell>
                  <TableCell className="text-left tabular-nums">
                    {formatCurrency(it.unitPrice)}
                  </TableCell>
                  <TableCell className="text-center">٪{it.taxRate}</TableCell>
                  <TableCell className="text-left tabular-nums">
                    {formatCurrency(it.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 text-left text-lg font-bold">
            مبلغ کل: {formatCurrency(data.total)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
