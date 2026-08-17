"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, FileText, MoreHorizontal, ArrowLeft } from "lucide-react";
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
import { EmptyState } from "@/components/ui/empty-state";
import { deleteQuoteAction } from "@/actions/quotes";
import { formatCurrency, formatDate } from "@/lib/format";
import type { quotes } from "@/db/schema";

type Quote = typeof quotes.$inferSelect;

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
  quotes: Quote[];
};

export function QuoteList({ quotes }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    const res = await deleteQuoteAction(deleting.id);
    setBusy(false);
    if (res.ok) {
      toast.success("پیشنهاد فروش حذف شد");
      setDeleting(null);
      router.refresh();
    } else {
      toast.error("خطا در حذف");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">پیشنهادهای فروش</CardTitle>
          <Button size="sm" asChild>
            <Link href="/quotes/new">
              <Plus className="size-4" />
              پیشنهاد جدید
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="پیشنهادی ثبت نشده"
              description="اولین پیشنهاد فروش خود را بسازید."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>شماره</TableHead>
                  <TableHead>مشتری</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead className="text-end">مبلغ کل</TableHead>
                  <TableHead>تاریخ ایجاد</TableHead>
                  <TableHead>اعتبار تا</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <Link
                        href={`/quotes/${q.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {q.number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {q.contactId ? "—" : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[q.status] ?? "outline"}>
                        {STATUS_LABELS[q.status] ?? q.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {formatCurrency(q.total)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(q.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {q.validUntil ? formatDate(q.validUntil) : "—"}
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
                            <Link href={`/quotes/${q.id}`}>
                              <ArrowLeft className="size-4 ltr:rotate-180" />
                              مشاهده
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleting(q)}
                          >
                            <Trash2 className="size-4" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف پیشنهاد فروش</DialogTitle>
            <DialogDescription>
              آیا از حذف پیشنهاد «{deleting?.number}» مطمئن هستید؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={busy}>
              انصراف
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
