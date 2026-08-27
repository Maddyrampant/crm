import type { Metadata } from "next";
import { requireWorkspace, hasPermission } from "@/lib/session";
import { listSurveysAction, getSurveyStatsAction } from "@/actions/csat-surveys";
import { PageHeader } from "@/components/ui/page-header";
import { CsatManager } from "@/components/csat/csat-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "نظرسنجی رضایت" };

export default async function CsatPage() {
  const { membership } = await requireWorkspace();
  const [surveysResult, stats] = await Promise.all([
    listSurveysAction(),
    getSurveyStatsAction(),
  ]);
  const surveys = surveysResult.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="نظرسنجی رضایت مشتری"
        description="ارسال و مدیریت نظرسنجی‌های CSAT، NPS و CES."
      />
      <CsatManager
        initialSurveys={surveys}
        initialStats={stats}
        canManage={hasPermission(membership, "manager")}
      />
    </div>
  );
}
