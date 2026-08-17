import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { SmsCampaignList } from "@/components/sms/sms-campaign-list";
import { SmsCampaignForm } from "@/components/sms/sms-campaign-form";
import { listSmsCampaignsAction } from "@/actions/sms";
import { RefreshWrapper } from "@/components/shared/refresh-wrapper";

export const metadata: Metadata = { title: "پیامک" };

export default async function SmsPage() {
  const res = await listSmsCampaignsAction();
  const campaigns = res.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="کمپین‌های پیامکی"
        description="ایجاد و ارسال کمپین‌های پیامکی"
      />
      <RefreshWrapper>
        {(refresh) => (
          <>
            <SmsCampaignForm onCreated={refresh} />
            <SmsCampaignList campaigns={campaigns} onRefresh={refresh} />
          </>
        )}
      </RefreshWrapper>
    </div>
  );
}
