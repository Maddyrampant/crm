"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Send, Trash2, Mail, MailCheck, MousePointerClick } from "lucide-react";
import { toast } from "sonner";
import {
  listCampaignsAction,
  deleteCampaignAction,
  sendCampaignAction,
  listCampaignTemplatesAction,
  deleteCampaignTemplateAction,
} from "@/actions/email-campaign";
import { formatDateTime, toFaDigits } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CampaignFormDialog } from "./campaign-form";
import { TemplateFormDialog } from "./template-form";
import type { emailCampaigns, campaignEmailTemplates } from "@/db/schema";

type CampaignRow = typeof emailCampaigns.$inferSelect;
type TemplateRow = typeof campaignEmailTemplates.$inferSelect;

type Props = {
  initialCampaigns: CampaignRow[];
  initialTemplates: TemplateRow[];
  canManage: boolean;
};

const statusLabels: Record<string, { label: string; className: string }> = {
  draft: { label: "پیش‌نویس", className: "bg-muted text-muted-foreground" },
  scheduled: {
    label: "زمان‌بندی‌شده",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  sending: {
    label: "در حال ارسال",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  sent: {
    label: "ارسال‌شده",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  failed: { label: "ناموفق", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

export function EmailManager({
  initialCampaigns,
  initialTemplates,
  canManage,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [templates, setTemplates] = useState(initialTemplates);

  const [campaignFormOpen, setCampaignFormOpen] = useState(false);
  const [templateFormOpen, setTemplateFormOpen] = useState(false);

  async function handleRefresh() {
    startTransition(async () => {
      const [cRes, tRes] = await Promise.all([
        listCampaignsAction(),
        listCampaignTemplatesAction(),
      ]);
      if (cRes.ok) setCampaigns(cRes.data);
      if (tRes.ok) setTemplates(tRes.data);
      router.refresh();
    });
  }

  async function handleDeleteCampaign(id: string) {
    if (!confirm("آیا از حذف این کمپین اطمینان دارید؟")) return;
    const result = await deleteCampaignAction(id);
    if (result.ok) {
      toast.success("کمپین حذف شد");
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } else {
      toast.error("خطا در حذف کمپین");
    }
  }

  async function handleSendCampaign(id: string) {
    if (!confirm("آیا از ارسال این کمپین اطمینان دارید؟")) return;
    const result = await sendCampaignAction(id);
    if (result.ok) {
      toast.success("کمپین با موفقیت ارسال شد");
      handleRefresh();
    } else {
      toast.error("خطا در ارسال کمپین");
    }
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm("آیا از حذف این قالب اطمینان دارید؟")) return;
    const result = await deleteCampaignTemplateAction(id);
    if (result.ok) {
      toast.success("قالب حذف شد");
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      router.refresh();
    } else {
      toast.error("خطا در حذف قالب");
    }
  }

  return (
    <>
      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">کمپین‌ها</TabsTrigger>
          <TabsTrigger value="templates">قالب‌ها</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">کمپین‌های ایمیلی</CardTitle>
              {canManage && (
                <Button
                  size="sm"
                  onClick={() => setCampaignFormOpen(true)}
                  disabled={isPending}
                >
                  <Plus className="size-4" />
                  کمپین جدید
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <EmptyState
                  icon={Mail}
                  title="هنوز کمپینی ایجاد نشده"
                  description="اولین کمپین ایمیلی خود را بسازید."
                >
                  {canManage && (
                    <Button size="sm" onClick={() => setCampaignFormOpen(true)}>
                      <Plus className="size-4" />
                      کمپین جدید
                    </Button>
                  )}
                </EmptyState>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>نام</TableHead>
                        <TableHead>موضوع</TableHead>
                        <TableHead>وضعیت</TableHead>
                        <TableHead className="text-left">ارسال‌شده</TableHead>
                        <TableHead className="text-left">بازشده</TableHead>
                        <TableHead className="text-left">کلیک‌شده</TableHead>
                        <TableHead>تاریخ ایجاد</TableHead>
                        <TableHead className="text-left">عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((c) => {
                        const sl = statusLabels[c.status] ?? statusLabels.draft;
                        return (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">
                              {c.name}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {c.subject}
                            </TableCell>
                            <TableCell>
                              <Badge className={sl.className}>{sl.label}</Badge>
                            </TableCell>
                            <TableCell className="text-left tabular-nums">
                              {toFaDigits(c.totalSent ?? 0)}
                            </TableCell>
                            <TableCell className="text-left tabular-nums">
                              {toFaDigits(c.totalOpened ?? 0)}
                            </TableCell>
                            <TableCell className="text-left tabular-nums">
                              {toFaDigits(c.totalClicked ?? 0)}
                            </TableCell>
                            <TableCell>
                              {formatDateTime(c.createdAt)}
                            </TableCell>
                            <TableCell className="text-left">
                              <div className="flex justify-end gap-1">
                                {canManage && c.status === "draft" && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    title="ارسال"
                                    disabled={isPending}
                                    onClick={() => handleSendCampaign(c.id)}
                                  >
                                    <Send className="size-4 text-emerald-600" />
                                  </Button>
                                )}
                                {canManage && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    title="حذف"
                                    disabled={isPending}
                                    onClick={() => handleDeleteCampaign(c.id)}
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">قالب‌های ایمیلی</CardTitle>
              {canManage && (
                <Button
                  size="sm"
                  onClick={() => setTemplateFormOpen(true)}
                  disabled={isPending}
                >
                  <Plus className="size-4" />
                  قالب جدید
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <EmptyState
                  icon={MailCheck}
                  title="هنوز قالبی ایجاد نشده"
                  description="قالب‌های ایمیلی خود را برای استفاده در کمپین‌ها بسازید."
                >
                  {canManage && (
                    <Button size="sm" onClick={() => setTemplateFormOpen(true)}>
                      <Plus className="size-4" />
                      قالب جدید
                    </Button>
                  )}
                </EmptyState>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>نام</TableHead>
                        <TableHead>موضوع</TableHead>
                        <TableHead>تاریخ ایجاد</TableHead>
                        <TableHead className="text-left">عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {t.subject}
                          </TableCell>
                          <TableCell>{formatDateTime(t.createdAt)}</TableCell>
                          <TableCell className="text-left">
                            <div className="flex justify-end gap-1">
                              {canManage && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  title="حذف"
                                  disabled={isPending}
                                  onClick={() => handleDeleteTemplate(t.id)}
                                >
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CampaignFormDialog
        open={campaignFormOpen}
        onOpenChange={setCampaignFormOpen}
        onSaved={() => {
          setCampaignFormOpen(false);
          handleRefresh();
        }}
      />

      <TemplateFormDialog
        open={templateFormOpen}
        onOpenChange={setTemplateFormOpen}
        onSaved={() => {
          setTemplateFormOpen(false);
          handleRefresh();
        }}
      />
    </>
  );
}
