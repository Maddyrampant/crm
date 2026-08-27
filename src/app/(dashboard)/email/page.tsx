import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/session";
import {
  listCampaignsAction,
  listCampaignTemplatesAction,
} from "@/actions/email-campaign";
import { PageHeader } from "@/components/ui/page-header";
import { EmailManager } from "@/components/email/email-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ایمیل مارکتینگ" };

export default async function EmailPage() {
  const { membership } = await requireWorkspace();

  const [campaignsResult, templatesResult] = await Promise.all([
    listCampaignsAction(),
    listCampaignTemplatesAction(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="ایمیل مارکتینگ"
        description="ارسال کمپین‌های ایمیلی و مدیریت قالب‌ها."
      />
      <EmailManager
        initialCampaigns={campaignsResult.ok ? campaignsResult.data : []}
        initialTemplates={templatesResult.ok ? templatesResult.data : []}
        canManage={membership.role === "admin" || membership.role === "manager"}
      />
    </div>
  );
}
