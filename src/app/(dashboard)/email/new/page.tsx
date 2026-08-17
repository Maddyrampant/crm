import type { Metadata } from "next";
import { listCampaignTemplatesAction } from "@/actions/email-campaign";
import { PageHeader } from "@/components/ui/page-header";
import { CampaignForm } from "@/components/email/campaign-form";

export const metadata: Metadata = { title: "کمپین جدید" };

export default async function NewCampaignPage() {
  const res = await listCampaignTemplatesAction();
  const templates = res.ok ? res.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="کمپین جدید"
        description="ساخت کمپین ایمیلی جدید"
      />
      <CampaignForm templates={templates} />
    </div>
  );
}
