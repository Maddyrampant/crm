import type { Metadata } from "next";
import { listCampaignTemplatesAction } from "@/actions/email-campaign";
import { PageHeader } from "@/components/ui/page-header";
import { TemplateList } from "@/components/email/template-list";

export const metadata: Metadata = { title: "قالب‌های ایمیل" };

export default async function EmailTemplatesPage() {
  const res = await listCampaignTemplatesAction();
  const templates = res.ok ? res.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="قالب‌های ایمیل"
        description="مدیریت قالب‌های قابل استفاده در کمپین‌ها"
      />
      <TemplateList templates={templates} />
    </div>
  );
}
