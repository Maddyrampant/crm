"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Inbox, Loader2, Pencil, Plus, ScrollText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime, toFaDigits } from "@/lib/format";
import { deleteRuleAction, toggleRuleAction } from "@/actions/rules";
import {
  RuleFormDialog,
  type StageOption,
} from "@/components/rules/rule-form-dialog";
import { ACTION_LABELS, eventLabel } from "@/components/rules/labels";
import type { Rule, RuleLog } from "@/db/schema";

type Props = {
  rules: Rule[];
  logs: RuleLog[];
  stages: StageOption[];
};

export function RulesPanel({ rules, logs, stages }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(rule: Rule) {
    setEditing(rule);
    setDialogOpen(true);
  }

  async function handleToggle(rule: Rule, active: boolean) {
    if (busyId) return;
    setBusyId(rule.id);
    const result = await toggleRuleAction(rule.id, active);
    setBusyId(null);
    if (!result.ok) {
      toast.error("خطا در تغییر وضعیت قانون");
      return;
    }
    router.refresh();
  }

  async function handleDelete(rule: Rule) {
    if (busyId) return;
    if (!confirm(`قانون «${rule.name}» حذف شود؟`)) return;
    setBusyId(rule.id);
    const result = await deleteRuleAction(rule.id);
    setBusyId(null);
    if (!result.ok) {
      toast.error("خطا در حذف قانون");
      return;
    }
    toast.success("قانون حذف شد");
    router.refresh();
  }

  return (
    <Tabs defaultValue="rules">
      <TabsList>
        <TabsTrigger value="rules">قوانین</TabsTrigger>
        <TabsTrigger value="logs">لاگ اجرا</TabsTrigger>
      </TabsList>

      <TabsContent value="rules" className="space-y-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base">قوانین اتوماسیون</CardTitle>
              <CardDescription>
                روی رویدادها شرط بگذارید و اکشن خودکار اجرا کنید
              </CardDescription>
            </div>
            <Button onClick={openCreate} size="sm">
              <Plus className="size-4" />
              قانون جدید
            </Button>
          </CardHeader>
          <CardContent>
            {rules.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="قانونی ثبت نشده است"
                description="اولین قانون را بسازید — مثلاً در تغییر مرحلهٔ فروش، یادآور بسازید."
                className="py-10"
              />
            ) : (
              <ul className="space-y-3">
                {rules.map((rule) => (
                  <li
                    key={rule.id}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="grid gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{rule.name}</p>
                          <Badge variant="secondary">
                            {eventLabel(rule.event)}
                          </Badge>
                          {!rule.active && <Badge variant="outline">غیرفعال</Badge>}
                        </div>
                        {rule.description ? (
                          <p className="text-xs text-muted-foreground">
                            {rule.description}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                          <span>
                            {toFaDigits(rule.conditions.length)} شرط
                          </span>
                          <span>
                            {toFaDigits(rule.actions.length)} اکشن
                          </span>
                          <span className="flex flex-wrap gap-1">
                            {rule.actions.map((a, i) => (
                              <Badge key={i} variant="outline" className="text-[10px]">
                                {ACTION_LABELS[a.type] ?? a.type}
                              </Badge>
                            ))}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5" title={rule.active ? "فعال" : "غیرفعال"}>
                          <Switch
                            checked={rule.active}
                            disabled={busyId === rule.id}
                            onCheckedChange={(checked) => handleToggle(rule, checked)}
                          />
                        </div>
                        <Button
                          size="icon"
                          variant="outline"
                          disabled={busyId === rule.id}
                          onClick={() => openEdit(rule)}
                        >
                          {busyId === rule.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Pencil className="size-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="text-destructive"
                          disabled={busyId === rule.id}
                          onClick={() => handleDelete(rule)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="logs">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">لاگ اجرا</CardTitle>
            <CardDescription>۲۵ رویداد اخیر پردازش‌شده توسط انجین قوانین</CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <EmptyState
                icon={ScrollText}
                title="لاگی ثبت نشده است"
                description="وقتی قوانین اجرا شوند، نتیجهٔ هر اجرا اینجا نمایش داده می‌شود."
                className="py-10"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right text-xs text-muted-foreground">
                      <th className="py-2 pe-3 font-medium">رویداد</th>
                      <th className="py-2 pe-3 font-medium">تطبیق</th>
                      <th className="py-2 pe-3 font-medium">اکشن‌های اجراشده</th>
                      <th className="py-2 pe-3 font-medium">خطا</th>
                      <th className="py-2 font-medium">زمان</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b last:border-0">
                        <td className="py-2 pe-3">
                          {eventLabel(log.event)}
                        </td>
                        <td className="py-2 pe-3">
                          {log.matched ? (
                            <Badge variant="secondary">بله</Badge>
                          ) : (
                            <Badge variant="outline">خیر</Badge>
                          )}
                        </td>
                        <td className="py-2 pe-3">
                          {toFaDigits(log.actionsExecuted)}
                        </td>
                        <td className="max-w-56 py-2 pe-3">
                          {log.error ? (
                            <span
                              className="line-clamp-1 text-xs text-destructive"
                              title={log.error}
                            >
                              {log.error}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap py-2 text-xs text-muted-foreground">
                          {formatDateTime(log.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <RuleFormDialog
        key={editing?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rule={editing}
        stages={stages}
      />
    </Tabs>
  );
}
