import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/session";
import { listFieldsAction } from "@/actions/custom-fields";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadScoringSettings } from "@/components/lead-scoring/lead-scoring-settings";
import { getLeadScoreSettingsAction } from "@/actions/lead-scoring";

export const metadata: Metadata = { title: "امتیازدهی لید" };

export default async function LeadScoringPage() {
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
