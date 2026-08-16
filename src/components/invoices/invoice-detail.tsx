"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner";
import {
  recordPaymentAction,
  updateInvoiceStatusAction,
} from "@/actions/invoices";
import { formatCurrency, formatDate } from "@/lib/format";
import type { getInvoice } from "@/services/invoices";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceStatusBadge } from "./status-badge";

type InvoiceDetailData = NonNullable<Awaited<ReturnType<typeof getInvoice>>>;

export function InvoiceDetail({ data }: { data: InvoiceDetailData }) {
  const { invoice, contact, items, payments } = data;
  const [payOpen, setPayOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState({
    amount: invoice.total,
    method: "card",
    reference: "",
  });

  const paidTotal = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const remaining = Math.max(0, Number(invoice.total) - paidTotal);

  async function changeStatus(status: "sent" | "cancelled") {
    const res = await updateInvoiceStatusAction(invoice.id, status);
    if (res.ok) {
      toast.success("وضعیت به‌روزرسانی شد");
      window.location.reload();
    } else {
      toast.error("خطا");
    }
  }

  async function handleRecordPayment() {
    setLoading(true);
    const res = await recordPaymentAction(invoice.id, {
      amount: Number(payment.amount),
      method: payment.method,
      reference: payment.reference,
    });
    setLoading(false);
    if (res.ok) {
      toast.success("پرداخت ثبت شد");
      setPayOpen(false);
      window.location.reload();
    } else {
      toast.error("خطا در ثبت پرداخت");
    }
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link href="/invoices">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold" dir="ltr">
              {invoice.number}
            </h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer />
            چاپ
          </Button>
          {invoice.status === "draft" && (
            <Button
              variant="default"
              onClick={() => changeStatus("sent")}
            >
              ارسال فاکتور
            </Button>
          )}
          {invoice.status !== "cancelled" && invoice.status !== "paid" && (
            <Button variant="default" onClick={() => setPayOpen(true)}>
              ثبت پرداخت
            </Button>
          )}
          {invoice.status === "sent" && (
            <Button
              variant="outline"
              className="text-destructive"
              onClick={() => changeStatus("cancelled")}
            >
              لغو فاکتور
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 print:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">مشتری</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">
              {contact.firstName} {contact.lastName}
            </p>
            {contact.email && <p className="text-muted-foreground">{contact.email}</p>}
            {contact.phone && <p className="text-muted-foreground">{contact.phone}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">جزئیات</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-1 text-sm">
            <span className="text-muted-foreground">تاریخ صدور</span>
            <span>{formatDate(invoice.issuedAt)}</span>
            <span className="text-muted-foreground">سررسید</span>
            <span>{formatDate(invoice.dueAt)}</span>
            <span className="text-muted-foreground">مبلغ کل</span>
            <span className="font-bold">{formatCurrency(invoice.total)}</span>
            <span className="text-muted-foreground">مانده</span>
            <span className="font-bold">{formatCurrency(remaining)}</span>
          </CardContent>
        </Card>
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
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>
                    <span className="block font-medium">{it.description}</span>
                    {it.productName && (
                      <span className="block text-xs text-muted-foreground">
                        {it.productName}
                      </span>
                    )}
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
            {Number(invoice.discount) > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4}>تخفیف</TableCell>
                  <TableCell className="text-left tabular-nums">
                    -{formatCurrency(invoice.discount)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
          <div className="mt-4 text-left text-lg font-bold">
            مبلغ کل: {formatCurrency(invoice.total)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">پرداخت‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              هنوز پرداختی ثبت نشده است
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>روش</TableHead>
                  <TableHead>مرجع</TableHead>
                  <TableHead className="text-left">مبلغ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.paidAt)}</TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell>{p.reference || "—"}</TableCell>
                    <TableCell className="text-left tabular-nums">
                      {formatCurrency(p.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ثبت پرداخت</DialogTitle>
            <DialogDescription>
              برای فاکتور {invoice.number}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>مبلغ (تومان)</Label>
              <Input
                type="number"
                min="0"
                dir="ltr"
                value={payment.amount}
                onChange={(e) =>
                  setPayment({ ...payment, amount: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>روش پرداخت</Label>
              <Select
                value={payment.method}
                onValueChange={(method) =>
                  setPayment({ ...payment, method })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقدی</SelectItem>
                  <SelectItem value="card">کارتخوان</SelectItem>
                  <SelectItem value="transfer">انتقال بانکی</SelectItem>
                  <SelectItem value="check">چک</SelectItem>
                  <SelectItem value="other">سایر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>مرجع (اختیاری)</Label>
              <Input
                dir="ltr"
                placeholder="شماره پیگیری"
                value={payment.reference}
                onChange={(e) =>
                  setPayment({ ...payment, reference: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleRecordPayment} disabled={loading}>
              {loading ? "در حال ثبت…" : "ثبت پرداخت"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
