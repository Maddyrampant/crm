import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  DollarSign,
  Handshake,
  Kanban,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { addMonths, startOfMonth } from "date-fns-jalali";
import { format as formatJalali } from "date-fns-jalali";
import { requireWorkspace } from "@/lib/session";
import { db } from "@/db";
import { companies, contacts, deals, stages, user } from "@/db/schema";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StageFunnel } from "@/components/dashboard/stage-funnel";

export const metadata: Metadata = { title: "داشبورد" };

const MONTH_LABEL = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

export default async function DashboardPage() {
  const { workspaceId } = await requireWorkspace();

  const monthStart = startOfMonth(new Date());
  const sixMonthsAgo = startOfMonth(addMonths(new Date(), -5));

  const [
    contactTotal,
    newContacts,
    openDeals,
    wonDeals,
    pipelineValue,
    wonValue,
    wonRows,
    stageRows,
    recentContacts,
    recentDeals,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(contacts)
      .where(eq(contacts.workspaceId, workspaceId)),
    db
      .select({ value: count() })
      .from(contacts)
      .where(and(eq(contacts.workspaceId, workspaceId), gte(contacts.createdAt, monthStart))),
    db
      .select({ value: count() })
      .from(deals)
      .where(and(eq(deals.workspaceId, workspaceId), eq(deals.status, "open"))),
    db
      .select({ value: count() })
      .from(deals)
      .where(and(eq(deals.workspaceId, workspaceId), eq(deals.status, "won"))),
    db
      .select({ value: sql<string>`coalesce(sum(${deals.amount}), 0)` })
      .from(deals)
      .where(and(eq(deals.workspaceId, workspaceId), eq(deals.status, "open"))),
    db
      .select({ value: sql<string>`coalesce(sum(${deals.amount}), 0)` })
      .from(deals)
      .where(and(eq(deals.workspaceId, workspaceId), eq(deals.status, "won"))),
    db
      .select({ wonAt: deals.wonAt, amount: deals.amount })
      .from(deals)
      .where(
        and(
          eq(deals.workspaceId, workspaceId),
          eq(deals.status, "won"),
          gte(deals.wonAt, sixMonthsAgo)
        )
      ),
    db
      .select({
        stageId: stages.id,
        stageName: stages.name,
        stageColor: stages.color,
        count: count(),
        value: sql<string>`coalesce(sum(${deals.amount}), 0)`,
      })
      .from(deals)
      .innerJoin(stages, eq(stages.id, deals.stageId))
      .where(and(eq(deals.workspaceId, workspaceId), eq(deals.status, "open")))
      .groupBy(stages.id, stages.name, stages.color)
      .orderBy(sql`count desc`),
    db
      .select({
        contact: contacts,
        companyName: companies.name,
        ownerName: user.name,
      })
      .from(contacts)
      .leftJoin(companies, eq(companies.id, contacts.companyId))
      .leftJoin(user, eq(user.id, contacts.ownerId))
      .where(eq(contacts.workspaceId, workspaceId))
      .orderBy(desc(contacts.createdAt))
      .limit(5),
    db
      .select({
        deal: deals,
        contactName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactId: contacts.id,
        stageName: stages.name,
        stageColor: stages.color,
      })
      .from(deals)
      .leftJoin(contacts, eq(contacts.id, deals.contactId))
      .leftJoin(stages, eq(stages.id, deals.stageId))
      .where(eq(deals.workspaceId, workspaceId))
      .orderBy(desc(deals.updatedAt))
      .limit(5),
  ]);

  const revenueByMonth = (() => {
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

  const stats = [
    {
      title: "مشتریان",
      value: formatNumber(contactTotal[0]?.value ?? 0),
      icon: Users,
      hint: `${formatNumber(newContacts[0]?.value ?? 0)} نفر این ماه`,
    },
    {
      title: "فروش‌های باز",
      value: formatNumber(openDeals[0]?.value ?? 0),
      icon: Target,
      hint: "فرصت‌های در حال مذاکره",
    },
    {
      title: "ارزش فانل فروش",
      value: formatCurrency(pipelineValue[0]?.value ?? 0),
      icon: DollarSign,
      hint: "مجموع مبلغ فروش‌های باز",
    },
    {
      title: "ارزش بردها",
      value: formatCurrency(wonValue[0]?.value ?? 0),
      icon: TrendingUp,
      hint: `${formatNumber(wonDeals[0]?.value ?? 0)} فروش بسته شده`,
    },
  ];

  const quickActions = [
    { title: "مشتری جدید", href: "/contacts", icon: Users },
    { title: "فانل فروش", href: "/pipeline", icon: Kanban },
    { title: "لیست فروش‌ها", href: "/pipeline/deals", icon: Handshake },
    { title: "شرکت‌ها", href: "/companies", icon: Building2 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="داشبورد"
        description="نمای کلی از وضعیت فروش و مشتریان شما"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard
            key={s.title}
            title={s.title}
            value={s.value}
            hint={s.hint}
            icon={s.icon}
          />
        ))}
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
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
            <RevenueChart data={revenueByMonth} />
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
                    {r.contact.lastName ? r.contact.lastName.charAt(0) : ""}
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
                  href="/pipeline"
                  className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-accent"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Zap className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.deal.title}</p>
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
                    <p className="text-xs text-muted-foreground">{r.stageName || "—"}</p>
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
