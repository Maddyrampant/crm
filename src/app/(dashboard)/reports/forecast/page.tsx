import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/session";
import { getForecast, getStalledDeals } from "@/services/forecast";
import { PageHeader } from "@/components/ui/page-header";
import { ForecastPanel } from "@/components/reports/forecast-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ReportExportButton } from "@/components/reports/report-export-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "پیش‌بینی فروش" };

export default async function ForecastPage() {
  const { workspaceId } = await requireWorkspace();
  const [forecast, stalled] = await Promise.all([
    getForecast(workspaceId),
    getStalledDeals(workspaceId),
  ]);

  const totalWeighted = forecast.reduce((s, r) => s + r.weightedAmount, 0);
  const totalAmount = forecast.reduce((s, r) => s + r.totalAmount, 0);
  const totalDeals = forecast.reduce((s, r) => s + r.dealCount, 0);
  const avgProbability =
    totalAmount > 0
      ? Math.round((totalWeighted / totalAmount) * 100)
      : 0;

  const today = new Date().toISOString().slice(0, 10);
  const forecastCsv = [
    ["مرحله", "احتمال برد", "تعداد دیل", "مجموع مبلغ", "مبلغ وزنی"],
    ...forecast.map((r) => [
      r.stageName,
      `${r.winProbability}%`,
      String(r.dealCount),
      String(r.totalAmount),
      String(r.weightedAmount),
    ]),
    [],
    ["دیلهای متوقف‌شده"],
    ["عنوان", "مبلغ", "مرحله", "روز از آخرین بروزرسانی"],
    ...stalled.map((r) => [
      r.title,
      String(r.amount),
      r.stageName,
      String(r.daysSinceUpdate),
    ]),
  ]
    .map((row) => row.join(","))
    .join("\n");

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "گزارش‌ها", href: "/reports" }, { label: "پیش‌بینی فروش" }]} />
      <PageHeader
        title="پیش‌بینی فروش"
        description="مجموع وزنی فرصتها، دیلهای متوقف‌شده و پیش‌بینی هوشمند"
      >
        <ReportExportButton csvContent={forecastCsv} filename={`forecast-${today}.csv`} />
      </PageHeader>
      <ForecastPanel
        forecast={forecast}
        stalled={stalled}
        totalWeighted={totalWeighted}
        totalDeals={totalDeals}
        avgProbability={avgProbability}
      />
    </div>
  );
}
