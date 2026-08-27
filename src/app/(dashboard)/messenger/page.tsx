import type { Metadata } from "next";
import { requireWorkspace, hasPermission } from "@/lib/session";
import { listIntegrationsAction } from "@/actions/messenger-integrations";
import { PageHeader } from "@/components/ui/page-header";
import { MessengerManager } from "@/components/messenger/messenger-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "پیام‌رسان‌ها" };

export default async function MessengerPage() {
  const { membership } = await requireWorkspace();
  const integrations = await listIntegrationsAction();

  return (
    <div className="space-y-6">
      <PageHeader
        title="اتصال پیام‌رسان‌ها"
        description="اتصال و مدیریت واتساپ، تلگرام و اینستاگرام به CRM."
      />
      <MessengerManager
        initialIntegrations={integrations}
        canManage={hasPermission(membership, "admin")}
      />
    </div>
  );
}
