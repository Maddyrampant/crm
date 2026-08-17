"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Send, Trash2, Mail, MoreHorizontal } from "lucide-react";
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
import { deleteCampaignAction, sendCampaignAction } from "@/actions/email-campaign";
import { formatDateTime } from "@/lib/format";
import { emailCampaigns } from "@/db/schema";

type EmailCampaign = typeof emailCampaigns.$inferSelect;

const STATUS_LABELS: Record<string, string> = {
  draft: "پیش‌نویس",
  scheduled: "زمان‌بندی‌شده",
  sending: "در حال ارسال",
  sent: "ارسال شده",
  failed: "ناموفق",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  scheduled: "secondary",
  sending: "default",
  sent: "default",
  destructive: "destructive",
};

type Props = {
  campaigns: EmailCampaign[];
};

export function CampaignList({ campaigns }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<EmailCampaign | null>(null);
  const [sending, setSending] = useState<EmailCampaign | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    const res = await deleteCampaignAction(deleting.id);
    setBusy(false);
    if (res.ok) {
      toast.success("کمپین حذف شد");
      setDeleting(null);
      router.refresh();
    } else {
      toast.error("خطا در حذف کمپین");
    }
  }

  async function handleSend() {
    if (!sending) return;
    setBusy(true);
    const res = await sendCampaignAction(sending.id);
    setBusy(false);
    if (res.ok) {
      toast.success("کمپین با موفقیت ارسال شد");
      setSending(null);
      router.refresh();
    } else {
      toast.error("error" in res ? res.error : "خطا در ارسال کمپین");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">کمپین‌های ایمیلی</CardTitle>
          <Button size="sm" asChild>
            <Link href="/email/new">
              <Plus className="size-4" />
              کمپین جدید
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="کمپینی ساخته نشده"
              description="اولین کمپین ایمیلی خود را بسازید."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام</TableHead>
                  <TableHead>موضوع</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead className="text-end">ارسال شده</TableHead>
                  <TableHead className="text-end">باز شده</TableHead>
                  <TableHead className="text-end">کلیک شده</TableHead>
                  <TableHead>تاریخ ایجاد</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.subject}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[c.status] ?? "outline"}>
                        {STATUS_LABELS[c.status] ?? c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {c.totalSent}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {c.totalOpened}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {c.totalClicked}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(c.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {c.status === "draft" && (
                            <DropdownMenuItem onClick={() => setSending(c)}>
                              <Send className="size-4" />
                              ارسال کمپین
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleting(c)}
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
            <DialogTitle>حذف کمپین</DialogTitle>
            <DialogDescription>
              آیا از حذف کمپین «{deleting?.name}» مطمئن هستید؟
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

      <Dialog open={!!sending} onOpenChange={(o) => !o && setSending(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ارسال کمپین</DialogTitle>
            <DialogDescription>
              کمپین «{sending?.name}» به تمام مخاطبین ارسال خواهد شد. آیا مطمئن
              هستید؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSending(null)} disabled={busy}>
              انصراف
            </Button>
            <Button onClick={handleSend} disabled={busy}>
              ارسال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
