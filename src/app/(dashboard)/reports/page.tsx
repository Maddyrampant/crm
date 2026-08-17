import type { Metadata } from "next";
import { getSalesChartAction, getTeamPerformanceAction } from "@/actions/reports";
import { SalesChart } from "@/components/reports/sales-chart";
import { TeamPerformanceTable } from "@/components/reports/team-performance-table";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users } from "lucide-react";

export const metadata: Metadata = { title: "گزارش‌های پیشرفته" };

export default async function AdvancedReportsPage() {
  const [salesResult, teamResult] = await Promise.all([
    getSalesChartAction(12),
    getTeamPerformanceAction(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="گزارش‌های پیشرفته"
        description="تحلیل فروش و عملکرد تیم"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-4 text-muted-foreground" />
              نمودار فروش
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SalesChart data={salesResult.ok ? salesResult.data : []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              عملکرد تیم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TeamPerformanceTable data={teamResult.ok ? teamResult.data : []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
