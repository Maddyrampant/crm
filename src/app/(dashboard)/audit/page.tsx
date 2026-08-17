import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/session";
import { getAuditLogsAction } from "@/actions/audit";
import { PageHeader } from "@/components/ui/page-header";
import { AuditLogTable } from "@/components/audit/audit-log-table";

export const metadata: Metadata = { title: "لاگ تغییرات" };

export default async function AuditPage() {
  const result = await getAuditLogsAction();

  return (
    <div className="space-y-6">
      <PageHeader
        title="لاگ تغییرات"
        description="مشاهده تاریخچه تغییرات سیستم."
      />
      <AuditLogTable initialLogs={result.ok ? result.data : []} />
    </div>
  );
}
