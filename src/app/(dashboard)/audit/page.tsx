import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { AuditLogList } from "@/components/audit/audit-log-list";
import { getAuditLogsAction } from "@/actions/audit";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "لاگ تغییرات" };

export default async function AuditPage() {
  const res = await getAuditLogsAction();
  const logs = res.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="لاگ تغییرات"
        description="تاریخچه تغییرات سیستم"
      />
      <AuditLogList logs={logs} />
    </div>
  );
}
