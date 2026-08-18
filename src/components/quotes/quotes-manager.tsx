"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, ArrowLeftRight, Search, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  deleteQuoteAction,
  convertQuoteToInvoiceAction,
} from "@/actions/quotes";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Quote } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QuoteForm } from "./quote-form";

type Contact = { id: string; name: string };

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

export function QuotesManager({
  initialData,
  contacts,
  canManage,
}: {
  initialData: Quote[];
  contacts: Contact[];
  canManage: boolean;
}) {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const router = useRouter();

  const contactMap = new Map(contacts.map((c) => [c.id, c.name]));

  const filtered = initialData.filter(
    (q) =>
      q.number.toLowerCase().includes(search.toLowerCase()) ||
      (contactMap.get(q.contactId) ?? "")
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  async function handleDelete(id: string) {
    if (!confirm("این پیشنهاد حذف شود؟")) return;
    const result = await deleteQuoteAction(id);
    if (result.ok) {
      toast.success("پیشنهاد حذف شد");
      router.refresh();
    } else {
      toast.error("خطا در حذف");
    }
  }

  async function handleConvert(id: string) {
    if (!confirm("این پیشنهاد به فاکتور تبدیل شود؟")) return;
    const result = await convertQuoteToInvoiceAction(id);
    if (result.ok) {
      toast.success("پیشنهاد به فاکتور تبدیل شد");
      router.refresh();
    } else {
      toast.error("خطا در تبدیل");
    }
  }

  if (initialData.length === 0 && !search) {
    return (
      <>
        <EmptyState
          title="هنوز پیشنهادی ثبت نشده"
          description="اولین پیشنهاد فروش خود را ایجاد کنید."
        >
          {canManage && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus />
              پیشنهاد جدید
            </Button>
          )}
        </EmptyState>
        <QuoteForm
          contacts={contacts}
          open={formOpen}
          onOpenChange={setFormOpen}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="جستجوی شماره یا نام مشتری…"
            className="ps-3 pe-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canManage && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus />
            پیشنهاد جدید
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>شماره</TableHead>
              <TableHead>مشتری</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead className="text-left">مبلغ کل</TableHead>
              <TableHead>سررسید</TableHead>
              <TableHead className="text-left">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  پیشنهادی یافت نشد
                </TableCell>
              </TableRow>
            )}
            {filtered.map((q) => {
              const s = statusMap[q.status];
              return (
                <TableRow key={q.id}>
                  <TableCell className="font-medium" dir="ltr">
                    {q.number}
                  </TableCell>
                  <TableCell>{contactMap.get(q.contactId) ?? "—"}</TableCell>
                  <TableCell>
                    <Badge className={s.className}>{s.label}</Badge>
                  </TableCell>
                  <TableCell className="text-left tabular-nums">
                    {formatCurrency(q.total)}
                  </TableCell>
                  <TableCell>{formatDate(q.validUntil)}</TableCell>
                  <TableCell className="text-left">
                    <div className="flex justify-end gap-1">
                      <Button asChild size="icon" variant="ghost" title="مشاهده">
                        <Link href={`/quotes/${q.id}`}>
                          <Eye className="size-4" />
                        </Link>
                      </Button>
                      {q.status !== "accepted" && q.status !== "rejected" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="تبدیل به فاکتور"
                          onClick={() => handleConvert(q.id)}
                        >
                          <ArrowLeftRight className="size-4 text-primary" />
                        </Button>
                      )}
                      {canManage && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="حذف"
                          onClick={() => handleDelete(q.id)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <QuoteForm
        contacts={contacts}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </div>
  );
}
