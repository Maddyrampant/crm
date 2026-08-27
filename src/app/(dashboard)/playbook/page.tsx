import type { Metadata } from "next";
import { requireWorkspace, hasPermission } from "@/lib/session";
import { listPlaybooksAction } from "@/actions/sales-playbook";
import { PageHeader } from "@/components/ui/page-header";
import { PlaybookManager } from "@/components/playbook/playbook-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "لیست پخش فروش" };

export default async function PlaybookPage() {
  const { membership } = await requireWorkspace();
  const playbooks = await listPlaybooksAction();

  return (
    <div className="space-y-6">
      <PageHeader
        title="لیست پخش فروش"
        description="چک‌لیت استاندارد مراحل فروش برای هر فرصت."
      />
      <PlaybookManager
        initialPlaybooks={playbooks}
        canManage={hasPermission(membership, "manager")}
      />
    </div>
  );
}
