"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { updateQuoteAction, convertQuoteToInvoiceAction } from "@/actions/quotes";
import { formatCurrency, formatDate } from "@/lib/format";
import type { quotes, quoteItems } from "@/db/schema";

type QuoteType = typeof quotes.$inferSelect;
type QuoteItemType = typeof quoteItems.$inferSelect;

const STATUS_LABELS: Record<string, string> = {
  draft: "پیش‌نویس",
  sent: "ارسال شده",
  accepted: "تأیید شده",
  rejected: "رد شده",
  expired: "منقضی شده",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  sent: "secondary",
  accepted: "default",
  rejected: "destructive",
  expired: "secondary",
};

type Props = {
  quote: Omit<QuoteType, never>;
  items: QuoteItemType[];
};

export function QuoteDetail({ quote, items }: Props) {
  const router = useRouter();

  async function handleSend() {
    const res = await updateQuoteAction(quote.id, { status: "sent" } as never);
    if (res.ok) {
      toast.success("پیشنهاد ارسال شد");
      router.refresh();
    } else {
      toast.error("خطا در ارسال");
    }
  }

  async function handleConvert() {
    const res = await convertQuoteToInvoiceAction(quote.id);
    if (res.ok && res.data) {
      toast.success("پیشنهاد به فاکتور تبدیل شد");
      router.push(`/invoices/${res.data.id}`);
    } else {
      toast.error("error" in res ? res.error : "خطا در تبدیل");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/quotes">
            <ArrowLeft className="size-4 ltr:rotate-180" />
            بازگشت
          </Link>
        </Button>
        {quote.status === "draft" && (
          <Button size="sm" onClick={handleSend}>
            <Send className="size-4" />
            ارسال پیشنهاد
          </Button>
        )}
        {quote.status === "sent" && (
          <Button size="sm" onClick={handleConvert}>
            <FileText className="size-4" />
            تبدیل به فاکتور
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{quote.number}</CardTitle>
            <Badge variant={STATUS_VARIANTS[quote.status] ?? "outline"}>
              {STATUS_LABELS[quote.status] ?? quote.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <span className="text-muted-foreground">تاریخ ایجاد:</span>
              <p className="font-medium">{formatDate(quote.createdAt)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">اعتبار تا:</span>
              <p className="font-medium">
                {quote.validUntil ? formatDate(quote.validUntil) : "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">مالیات (%):</span>
              <p className="font-medium">{quote.taxRate}%</p>
            </div>
          </div>

          {quote.notes && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <span className="text-muted-foreground">یادداشت:</span>
              <p className="mt-1">{quote.notes}</p>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ردیف</TableHead>
                <TableHead>توضیحات</TableHead>
                <TableHead className="text-end">تعداد</TableHead>
                <TableHead className="text-end">قیمت واحد</TableHead>
                <TableHead className="text-end">مالیات</TableHead>
                <TableHead className="text-end">مبلغ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={item.id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-end tabular-nums">
                    {Number(item.quantity)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {item.taxRate}%
                  </TableCell>
                  <TableCell className="text-end tabular-nums font-medium">
                    {formatCurrency(item.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">جمع فرعی:</span>
                <span className="tabular-nums">{formatCurrency(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">مالیات:</span>
                <span className="tabular-nums">{formatCurrency(quote.taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 text-base font-bold">
                <span>جمع کل:</span>
                <span className="tabular-nums">{formatCurrency(quote.total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
