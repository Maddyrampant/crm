"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Send, Trash2 } from "lucide-react";
import {
  deleteSmsCampaignAction,
  sendSmsCampaignAction,
} from "@/actions/sms";

type Campaign = {
  id: string;
  name: string;
  message: string;
  status: string;
  recipientType: string | null;
  createdAt: Date;
};

const statusLabels: Record<string, string> = {
  draft: "پیش‌نویس",
  sending: "در حال ارسال",
  sent: "ارسال شده",
  failed: "خطا",
};

type Props = {
  campaigns: Campaign[];
  onRefresh: () => void;
};

export function SmsCampaignList({ campaigns, onRefresh }: Props) {
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string, name: string) {
    if (!confirm(`آیا از حذف «${name}» اطمینان دارید؟`)) return;
    startTransition(async () => {
      const res = await deleteSmsCampaignAction(id);
      if (res.ok) {
        toast.success("کمپین حذف شد");
        onRefresh();
      } else {
        toast.error("خطا در حذف");
      }
    });
  }

  function handleSend(id: string) {
    if (!confirm("آیا از ارسال کمپین اطمینان دارید؟")) return;
    startTransition(async () => {
      const res = await sendSmsCampaignAction(id);
      if (res.ok) {
        toast.success("کمپین ارسال شد");
        onRefresh();
      } else {
        toast.error("error" in res ? res.error : "خطا در ارسال");
      }
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>نام</TableHead>
            <TableHead>پیام</TableHead>
            <TableHead>وضعیت</TableHead>
            <TableHead>تاریخ</TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                {c.message}
              </TableCell>
              <TableCell>
                <Badge variant={c.status === "sent" ? "default" : "secondary"}>
                  {statusLabels[c.status] ?? c.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(c.createdAt).toLocaleDateString("fa-IR")}
              </TableCell>
              <TableCell className="flex gap-1">
                {c.status === "draft" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => handleSend(c.id)}
                  >
                    <Send className="h-4 w-4 text-green-600" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => handleDelete(c.id, c.name)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {campaigns.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                کمپین پیامکی وجود ندارد
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
