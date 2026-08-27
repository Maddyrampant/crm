import type { Metadata } from "next";
import { requireWorkspace, hasPermission } from "@/lib/session";
import { listCallLogsAction } from "@/actions/call-logs";
import { PageHeader } from "@/components/ui/page-header";
import { CallLogsManager } from "@/components/call-logs/call-logs-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "لاگ تماس" };

export default async function CallLogsPage() {
  const { membership } = await requireWorkspace();
  const result = await listCallLogsAction();
  const logs = result.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="لاگ تماس‌ها"
        description="ثبت و مدیریت تماس‌های تلفنی با مشتریان."
      />
      <CallLogsManager
        initialLogs={logs}
        canManage={hasPermission(membership, "manager")}
      />
    </div>
  );
}
