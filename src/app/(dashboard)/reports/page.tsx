import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/session";
import {
  getKpis,
  getLeadSourceStats,
  getPipelineStats,
  getRecentActivity,
  getRevenueByMonth,
  getSalesChart,
  getTeamPerformance,
} from "@/services/reports";
import { DashboardCharts } from "@/components/reports/dashboard-charts";
import { RangeSelector } from "@/components/reports/range-selector";
import { StatCard } from "@/components/reports/stat-card";
import { ActivityFeed } from "@/components/reports/activity-feed";
import { SalesChart } from "@/components/reports/sales-chart";
import { TeamPerformanceTable } from "@/components/reports/team-performance-table";
import { PageHeader } from "@/components/ui/page-header";
import { Contact, Package, Banknote, TrendingUp, Clock3 } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "گزارش‌ها" };

const VALID_MONTHS = ["3", "6", "12"];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string }>;
}) {
  const { workspaceId } = await requireWorkspace();
  const { months: monthsParam } = await searchParams;
  const months = VALID_MONTHS.includes(monthsParam ?? "") ? Number(monthsParam) : 6;

  const [kpis, revenue, pipeline, leadSources, activity, salesChart, teamPerformance] =
    await Promise.all([
      getKpis(workspaceId),
      getRevenueByMonth(workspaceId, months),
      getPipelineStats(workspaceId),
      getLeadSourceStats(workspaceId),
      getRecentActivity(workspaceId),
      getSalesChart(workspaceId, months),
      getTeamPerformance(workspaceId),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader title="گزارش‌ها" description="نمای کلی عملکرد فروش">
        <RangeSelector value={String(months)} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Contact className="size-4" />}
          label="مخاطبین"
          value={String(kpis.contacts)}
        />
        <StatCard
          icon={<Package className="size-4" />}
          label="فرصت‌های باز"
          value={String(kpis.openDeals)}
          sub={`${kpis.wonDeals} برنده‌شده`}
        />
        <StatCard
          icon={<Banknote className="size-4" />}
          label="درآمد وصول‌شده"
          value={formatCurrency(kpis.collected)}
          sub={`${kpis.wonValue === 0 ? "0" : Math.round((kpis.collected / kpis.wonValue) * 100)}٪ وصول`}
        />
        <StatCard
          icon={<Clock3 className="size-4" />}
          label="فاکتورهای سررسید گذشته"
          value={String(kpis.overdueInvoices)}
        />
      </div>

      <SalesChart data={salesChart} months={months} />

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardCharts
          revenue={revenue}
          pipeline={pipeline}
          leadSources={leadSources}
          openValue={kpis.openValue}
          months={months}
        />
      </div>

      <TeamPerformanceTable data={teamPerformance} />

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="flex items-center gap-2 rounded-lg border bg-card p-4">
          <TrendingUp className="size-4 text-muted-foreground" />
          <div className="text-sm">
            <span className="text-muted-foreground">ارزش فرصت‌های باز: </span>
            <b>{formatCurrency(kpis.openValue)}</b>
          </div>
        </div>
        <ActivityFeed activities={activity} />
      </div>
    </div>
  );
}
