import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/session";
import { getTrackingStats } from "@/services/tracking";
import { PageHeader } from "@/components/ui/page-header";
import { TrackingCharts } from "@/components/reports/tracking-charts";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ReportExportButton } from "@/components/reports/report-export-button";

export const metadata: Metadata = { title: "ردیابی ایمیل و اسناد" };

export default async function TrackingPage() {
  const { workspaceId } = await requireWorkspace();
  const stats = await getTrackingStats(workspaceId);

  const TYPE_LABELS: Record<string, string> = {
    email_open: "باز شدن ایمیل",
    pdf_view: "مشاهده PDF",
    link_click: "کلیک لینک",
  };

  const today = new Date().toISOString().slice(0, 10);
  const trackingCsv = [
    ["نوع", "تعداد"],
    ...stats.map((s) => [TYPE_LABELS[s.type] ?? s.type, String(s.count)]),
  ]
    .map((row) => row.join(","))
    .join("\n");

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "گزارش‌ها", href: "/reports" }, { label: "ردیابی ایمیل و اسناد" }]} />
      <PageHeader
        title="ردیابی ایمیل و اسناد"
        description="آمار باز شدن ایمیل، مشاهده PDF و کلیک لینک"
      >
        <ReportExportButton csvContent={trackingCsv} filename={`tracking-${today}.csv`} />
      </PageHeader>
      <TrackingCharts stats={stats} />
    </div>
  );
}
