"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Mail, MoreHorizontal } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { deleteCampaignTemplateAction } from "@/actions/email-campaign";
import { formatDateTime } from "@/lib/format";
import { campaignEmailTemplates } from "@/db/schema";

type CampaignEmailTemplate = typeof campaignEmailTemplates.$inferSelect;

const CATEGORY_LABELS: Record<string, string> = {
  general: "عمومی",
  welcome: "خوشامدگویی",
  promo: "تبلیغاتی",
  follow_up: "پیگیری",
};

type Props = {
  templates: CampaignEmailTemplate[];
};

export function TemplateList({ templates }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<CampaignEmailTemplate | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    const res = await deleteCampaignTemplateAction(deleting.id);
    setBusy(false);
    if (res.ok) {
      toast.success("قالب حذف شد");
      setDeleting(null);
      router.refresh();
    } else {
      toast.error("خطا در حذف قالب");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">قالب‌های ایمیل</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="قالبی ساخته نشده"
              description="قالب‌های ایمیل برای استفاده مجدد در کمپین‌ها مفید هستند."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام</TableHead>
                  <TableHead>موضوع</TableHead>
                  <TableHead>دسته‌بندی</TableHead>
                  <TableHead>تاریخ ایجاد</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.subject}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {CATEGORY_LABELS[t.category ?? ""] ?? t.category ?? "عمومی"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(t.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleting(t)}
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
            <DialogTitle>حذف قالب</DialogTitle>
            <DialogDescription>
              آیا از حذف قالب «{deleting?.name}» مطمئن هستید؟
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
