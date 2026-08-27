import type { Metadata } from "next";
import { requireWorkspaceRole } from "@/lib/session";
import { getUsageStats, getUsageByDay, getUsageByModel } from "@/services/ai-usage";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toFaDigits } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "گزارش مصرف AI" };

export default async function AiUsagePage() {
  const { workspaceId } = await requireWorkspaceRole("manager");
  const [stats, byDay, byModel] = await Promise.all([
    getUsageStats(workspaceId),
    getUsageByDay(workspaceId),
    getUsageByModel(workspaceId),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "تنظیمات", href: "/settings" },
          { label: "هوش مصنوعی", href: "/settings/ai" },
          { label: "گزارش مصرف" },
        ]}
      />
      <PageHeader
        title="گزارش مصرف AI"
        description="آمار مصرف توکن و گفتگوها"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>کل گفتگوها</CardDescription>
            <CardTitle className="text-2xl">{toFaDigits(stats.totalConversations)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>کل پیام‌ها</CardDescription>
            <CardTitle className="text-2xl">{toFaDigits(stats.totalMessages)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>توکن ورودی</CardDescription>
            <CardTitle className="text-2xl">{toFaDigits(stats.totalInputTokens)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>توکن خروجی</CardDescription>
            <CardTitle className="text-2xl">{toFaDigits(stats.totalOutputTokens)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">مصرف بر اساس مدل</CardTitle>
          </CardHeader>
          <CardContent>
            {byModel.length === 0 ? (
              <p className="text-sm text-muted-foreground">داده‌ای موجود نیست</p>
            ) : (
              <ul className="space-y-2">
                {byModel.map((m) => (
                  <li key={m.model} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{m.model}</p>
                      <p className="text-xs text-muted-foreground">
                        {toFaDigits(m.conversations)} گفتگو — {toFaDigits(m.messages)} پیام
                      </p>
                    </div>
                    <span className="text-sm font-mono">{toFaDigits(m.tokens)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">مصرف روزانه (۳۰ روز اخیر)</CardTitle>
          </CardHeader>
          <CardContent>
            {byDay.length === 0 ? (
              <p className="text-sm text-muted-foreground">داده‌ای موجود نیست</p>
            ) : (
              <ul className="max-h-64 space-y-1 overflow-auto">
                {byDay.map((d) => (
                  <li key={d.date} className="flex items-center justify-between text-sm">
                    <span>{d.date}</span>
                    <span className="text-muted-foreground">
                      {toFaDigits(d.messages)} پیام — {toFaDigits(d.tokens)} توکن
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
