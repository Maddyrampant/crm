import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/session";
import { listSmsCampaignsAction } from "@/actions/sms";
import { PageHeader } from "@/components/ui/page-header";
import { SmsManager } from "@/components/sms/sms-manager";

export const metadata: Metadata = { title: "پیامک" };

export default async function SmsPage() {
  const { membership } = await requireWorkspace();
  const result = await listSmsCampaignsAction();

  return (
    <div className="space-y-6">
      <PageHeader
        title="کمپین‌های پیامکی"
        description="ایجاد و مدیریت کمپین‌های پیامکی."
      />
      <SmsManager
        initialCampaigns={result.ok ? result.data : []}
        canManage={membership.role === "admin" || membership.role === "manager"}
      />
    </div>
  );
}
