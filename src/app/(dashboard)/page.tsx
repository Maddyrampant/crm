import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  Bot,
  CheckCircle2,
  Clock3,
  ListTodo,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { requireWorkspace } from "@/lib/session";
import {
  getKpis,
  getLeadSourceStats,
  getPipelineStats,
  getRecentActivity,
  getRevenueByMonth,
} from "@/services/reports";
import { getOverdueInvoices } from "@/services/invoices";
import { getDueTasks } from "@/services/tasks";
import { getPendingApprovals } from "@/services/ai";
import { DashboardCharts } from "@/components/reports/dashboard-charts";
import { StatCard } from "@/components/reports/stat-card";
import { ActivityFeed } from "@/components/reports/activity-feed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "داشبورد" };

const toolLabels: Record<string, string> = {
  createContact: "ایجاد مشتری جدید",
  createTask: "ایجاد وظیفه",
  createDeal: "ایجاد فرصت فروش",
  updateDealStage: "تغییر مرحله فرصت",
  createInvoice: "صدور فاکتور",
  sendEmail: "ارسال ایمیل",
  sendSms: "ارسال پیامک",
};

const priorityColor: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-slate-400",
};

export default async function DashboardPage() {
  const { workspaceId, user } = await requireWorkspace();
  const [kpis, revenue, pipeline, leadSources, overdue, dueTasks, approvals, activity] =
    await Promise.all([
      getKpis(workspaceId),
      getRevenueByMonth(workspaceId),
      getPipelineStats(workspaceId),
      getLeadSourceStats(workspaceId),
      getOverdueInvoices(workspaceId),
      getDueTasks(workspaceId),
      getPendingApprovals(workspaceId),
      getRecentActivity(workspaceId),
    ]);

  const paidRatio =
    kpis.invoiceTotal > 0 ? Math.round((kpis.invoicePaid / kpis.invoiceTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            خوش آمدید، {user.name ?? "کاربر"}
          </h1>
          <p className="text-muted-foreground">نمای کلی وضعیت فروش و مشتریان شما</p>
        </div>
        <div className="hidden text-sm text-muted-foreground sm:block">
          {formatDate(new Date())}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={<Users className="size-4" />}
          label="مخاطبین"
          value={formatNumber(kpis.contacts)}
        />
        <StatCard
          icon={<Target className="size-4" />}
          label="فرصت‌های باز"
          value={formatNumber(kpis.openDeals)}
          sub={formatCurrency(kpis.openValue)}
        />
        <StatCard
          icon={<TrendingUp className="size-4" />}
          label="فروش بسته‌شده"
          value={formatNumber(kpis.wonDeals)}
          sub={`${kpis.winRate}٪ نرخ برد`}
        />
        <StatCard
          icon={<Banknote className="size-4" />}
          label="درآمد وصول‌شده"
          value={formatCurrency(kpis.collected)}
          sub={`${paidRatio}٪ از فاکتورها`}
        />
        <StatCard
          icon={<Clock3 className="size-4" />}
          label="فاکتورهای معوق"
          value={formatNumber(kpis.overdueInvoices)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-red-500" />
              فاکتورهای سررسید‌شده
            </CardTitle>
            <Link
              href="/invoices"
              className="text-xs text-muted-foreground hover:underline"
            >
              همه فاکتورها
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdue.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 text-emerald-500" />
                هیچ فاکتور معوقی نیست
              </p>
            ) : (
              overdue.map((o) => (
                <Link
                  key={o.id}
                  href={`/invoices/${o.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="font-medium">{o.number}</span>
                    <span className="truncate text-muted-foreground">
                      {o.contactName}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs">
                    <span className="font-semibold tabular-nums text-red-600">
                      {formatCurrency(o.total)}
                    </span>
                    {o.dueAt && (
                      <span className="text-muted-foreground">
                        {formatDate(o.dueAt)}
                      </span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-4 text-violet-500" />
              تأییدهای در انتظار دستیار
            </CardTitle>
            <Link
              href="/assistant"
              className="text-xs text-muted-foreground hover:underline"
            >
              دستیار هوشمند
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {approvals.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 text-emerald-500" />
                عملیاتی در انتظار تأیید نیست
              </p>
            ) : (
              <>
                {approvals.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                  >
                    <span className="truncate">
                      {toolLabels[a.toolName] ?? a.toolName}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(a.createdAt)}
                    </span>
                  </div>
                ))}
                <Link
                  href="/assistant"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  رفتن به دستیار برای تأیید
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardCharts
          revenue={revenue}
          pipeline={pipeline}
          leadSources={leadSources}
          openValue={kpis.openValue}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTodo className="size-4 text-sky-500" />
              وظایف امروز و سررسید‌شده
            </CardTitle>
            <Link
              href="/calendar"
              className="text-xs text-muted-foreground hover:underline"
            >
              همه تسک‌ها
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {dueTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                هیچ وظیفه‌ای در صف نیست
              </p>
            ) : (
              dueTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`size-2 shrink-0 rounded-full ${
                        priorityColor[t.priority] ?? "bg-slate-400"
                      }`}
                    />
                    <span className="truncate">{t.title}</span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {t.dueAt ? formatDate(t.dueAt) : "بدون سررسید"}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <ActivityFeed activities={activity} />
      </div>
    </div>
  );
}
