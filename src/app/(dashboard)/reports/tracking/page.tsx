import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/session";
import { getTrackingStats } from "@/services/tracking";
import { PageHeader } from "@/components/ui/page-header";
import { TrackingCharts } from "@/components/reports/tracking-charts";

export const metadata: Metadata = { title: "ردیابی ایمیل و اسناد" };

export default async function TrackingPage() {
  const { workspaceId } = await requireWorkspace();
  const stats = await getTrackingStats(workspaceId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="ردیابی ایمیل و اسناد"
        description="آمار باز شدن ایمیل، مشاهده PDF و کلیک لینک"
      />
      <TrackingCharts stats={stats} />
    </div>
  );
}
