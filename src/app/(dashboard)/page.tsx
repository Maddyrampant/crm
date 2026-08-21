import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowLeft,
  Building2,
  Handshake,
  Kanban,
  Users,
  Zap,
} from "lucide-react";
import { and, count, eq, gte } from "drizzle-orm";
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  addMonths,
} from "date-fns-jalali";
import { format as formatJalali } from "date-fns-jalali";
import { requireWorkspace } from "@/lib/session";
import { db } from "@/db";
import { contacts, deals } from "@/db/schema";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { getDashboardData } from "@/services/reports";
import { getStalledDeals } from "@/services/forecast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StageFunnel } from "@/components/dashboard/stage-funnel";
import { LeadSourcePie } from "@/components/dashboard/lead-source-pie";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { StalledDealsTable } from "@/components/dashboard/stalled-deals-table";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";

export const metadata: Metadata = { title: "داشبورد" };

const MONTH_LABEL = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

type RangeKey = "today" | "week" | "month" | "quarter" | "year" | "all";

function getDateRange(range: RangeKey): { start: Date; end: Date } {
  const now = new Date();
  const end = now;
  let start: Date;

  switch (range) {
    case "today":
      start = startOfDay(now);
      break;
    case "week":
      start = startOfWeek(now, { weekStartsOn: 6 });
      break;
    case "quarter":
      start = startOfQuarter(now);
      break;
    case "year":
      start = startOfYear(now);
      break;
    case "all":
      start = new Date(2020, 0, 1);
      break;
    case "month":
    default:
      start = startOfMonth(now);
      break;
  }

  return { start, end };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { workspaceId } = await requireWorkspace();
  const params = await searchParams;
  const range = (params.range as RangeKey) || "month";
  const { start: dateStart } = getDateRange(range);

  const sixMonthsAgo = startOfMonth(addMonths(new Date(), -5));

  const [
    dashboardData,
    newContactsRow,
    wonRows,
    stalledDeals,
  ] = await Promise.all([
    getDashboardData(workspaceId),
    db
      .select({ value: count() })
      .from(contacts)
      .where(
        and(
          eq(contacts.workspaceId, workspaceId),
          gte(contacts.createdAt, dateStart),
        ),
      ),
    db
      .select({ wonAt: deals.wonAt, amount: deals.amount })
      .from(deals)
      .where(
        and(
          eq(deals.workspaceId, workspaceId),
          eq(deals.status, "won"),
          gte(deals.wonAt, sixMonthsAgo),
        ),
      ),
    getStalledDeals(workspaceId),
  ]);

  const { kpis, leadSources, recentActivity, recentContacts, recentDeals } = dashboardData;
  const stageRows = dashboardData.pipelineStats.map((r) => ({
    stageName: r.name,
    stageColor: r.color,
    count: r.count,
    value: String(r.total),
  }));

  const revenueChartData = (() => {
    const months: { key: string; label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = startOfMonth(addMonths(new Date(), -i));
      const j = formatJalali(m, "yyyy/MM");
      const label = MONTH_LABEL[Number(formatJalali(m, "M")) - 1] ?? "";
      months.push({ key: j, label, value: 0 });
    }
    for (const row of wonRows) {
      if (!row.wonAt) continue;
      const key = formatJalali(row.wonAt, "yyyy/MM");
      const bucket = months.find((m) => m.key === key);
      if (bucket) bucket.value += Number(row.amount);
    }
    return months;
  })();

  const quickActions = [
    { title: "مشتری جدید", href: "/contacts", icon: Users },
    { title: "فانل فروش", href: "/pipeline", icon: Kanban },
    { title: "لیست فروش‌ها", href: "/pipeline/deals", icon: Handshake },
    { title: "شرکت‌ها", href: "/companies", icon: Building2 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="داشبورد" description="نمای کلی از وضعیت فروش و مشتریان شما">
        <Suspense>
          <DateRangeFilter defaultValue="month" />
        </Suspense>
      </PageHeader>

      <KpiCards
        data={{
          ...kpis,
          newContacts: newContactsRow[0]?.value ?? 0,
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((a) => (
          <Link
            key={a.title}
            href={a.href}
            className="group flex items-center gap-3 rounded-lg border bg-card p-3 text-card-foreground shadow-sm transition-colors hover:bg-accent"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <a.icon className="size-4" />
            </div>
            <span className="text-sm font-medium">{a.title}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">روند درآمد</CardTitle>
              <CardDescription>مبلغ بردها در ۶ ماه اخیر</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueChartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">توزیع مراحل فانل</CardTitle>
            <CardDescription>فروش‌های باز به تفکیک مرحله</CardDescription>
          </CardHeader>
          <CardContent>
            <StageFunnel
              data={stageRows.map((r) => ({
                name: r.stageName,
                count: Number(r.count),
                value: Number(r.value),
                color: r.stageColor || "#888888",
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">منابع مخاطبین</CardTitle>
            <CardDescription>توزیع مخاطبین بر اساس منبع ورود</CardDescription>
          </CardHeader>
          <CardContent>
            <LeadSourcePie data={leadSources} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">فعالیت‌های اخیر</CardTitle>
              <CardDescription>آخرین رویدادهای ثبت‌شده</CardDescription>
            </div>
            <ButtonLink href="/activity" />
          </CardHeader>
          <CardContent>
            <ActivityTimeline activities={recentActivity} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">فروش‌های در خطر</CardTitle>
              <CardDescription>فرصت‌های متوقف‌شده بیش از ۱۴ روز</CardDescription>
            </div>
            <ButtonLink href="/pipeline/deals" />
          </CardHeader>
          <CardContent>
            <StalledDealsTable deals={stalledDeals} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">مشتریان اخیر</CardTitle>
            <ButtonLink href="/contacts" />
          </CardHeader>
          <CardContent className="space-y-3">
            {recentContacts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                هنوز مشتری‌ای ثبت نشده است.
              </p>
            ) : (
              recentContacts.map((r) => (
                <Link
                  key={r.contact.id}
                  href={`/contacts/${r.contact.id}`}
                  className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-accent"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {r.contact.firstName.charAt(0)}
                    {r.contact.lastName
                      ? r.contact.lastName.charAt(0)
                      : ""}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {r.contact.firstName} {r.contact.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.companyName || r.contact.email || "—"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(r.contact.createdAt)}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">فروش‌های اخیر</CardTitle>
            <ButtonLink href="/pipeline/deals" />
          </CardHeader>
          <CardContent className="space-y-3">
            {recentDeals.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                هنوز فروشی ثبت نشده است.
              </p>
            ) : (
              recentDeals.map((r) => (
                <Link
                  key={r.deal.id}
                  href={`/pipeline/deals/${r.deal.id}`}
                  className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-accent"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Zap className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {r.deal.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.contactName
                        ? `${r.contactName} ${r.contactLastName ?? ""}`.trim()
                        : r.stageName || "بدون مشتری"}
                    </p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="text-sm font-medium">
                      {formatCurrency(r.deal.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.stageName || "—"}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ButtonLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      مشاهده همه
      <ArrowLeft className="size-3.5 ltr:rotate-180" />
    </Link>
  );
}
