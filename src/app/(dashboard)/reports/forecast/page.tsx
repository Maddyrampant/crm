import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/session";
import { getForecast, getStalledDeals } from "@/services/forecast";
import { PageHeader } from "@/components/ui/page-header";
import { ForecastPanel } from "@/components/reports/forecast-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";

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

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "گزارش‌ها", href: "/reports" }, { label: "پیش‌بینی فروش" }]} />
      <PageHeader
        title="پیش‌بینی فروش"
        description="مجموع وزنی فرصتها، دیلهای متوقف‌شده و پیش‌بینی هوشمند"
      />
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
