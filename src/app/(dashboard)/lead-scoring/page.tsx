import type { Metadata } from "next";
import { requireWorkspaceRole } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { LeadScoringSettings } from "@/components/lead-scoring/lead-scoring-settings";
import { getLeadScoreSettingsAction } from "@/actions/lead-scoring";

export const metadata: Metadata = { title: "امتیازدهی لید" };

export default async function LeadScoringPage() {
  await requireWorkspaceRole("manager");
  const [settingsRes] = await Promise.all([
    getLeadScoreSettingsAction(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="امتیازدهی لید"
        description="تنظیم وزن‌های امتیازدهی و امتیازدهی گروهی مخاطبین"
      />
      <LeadScoringSettings settings={settingsRes.data!} />
    </div>
  );
}
