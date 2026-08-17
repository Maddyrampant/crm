import type { Metadata } from "next";
import { listCampaignsAction } from "@/actions/email-campaign";
import { PageHeader } from "@/components/ui/page-header";
import { CampaignList } from "@/components/email/campaign-list";

export const metadata: Metadata = { title: "ایمیل‌مارکتینگ" };

export default async function EmailCampaignsPage() {
  const res = await listCampaignsAction();
  const campaigns = res.ok ? res.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="ایمیل‌مارکتینگ"
        description="ایجاد و ارسال کمپین‌های ایمیلی"
      />
      <CampaignList campaigns={campaigns} />
    </div>
  );
}
