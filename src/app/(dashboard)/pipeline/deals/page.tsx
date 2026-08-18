import type { Metadata } from "next";
import { requireWorkspace, hasPermission } from "@/lib/session";
import { listDeals } from "@/services/deals";
import { listPipelines } from "@/services/pipelines";
import { getWorkspaceMembers } from "@/services/workspace";
import { toDealRow, toPipelineRow } from "@/lib/serialize";
import { PageHeader } from "@/components/ui/page-header";
import { DealsTable } from "@/components/pipeline/deals-table";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata: Metadata = { title: "فروش‌ها" };

export default async function DealsPage() {
  const { workspaceId, membership } = await requireWorkspace();

  const [dealsResult, pipelines, membersResult] = await Promise.all([
    listDeals({ workspaceId, page: 1, pageSize: 20 }),
    listPipelines(workspaceId),
    getWorkspaceMembers(workspaceId),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "خط لوله", href: "/pipeline" }, { label: "فروش‌ها" }]} />
      <PageHeader
        title="فروش‌ها"
        description="همه فرصت‌های فروش با فیلتر و صفحه‌بندی؛ ثبت برد/باخت و حذف."
      />
      <DealsTable
        initialData={{
          items: dealsResult.items.map((r) =>
            toDealRow({
              ...r.deal,
              stageName: r.stageName,
              stageColor: r.stageColor,
              contactName: r.contactName,
              contactLastName: r.contactLastName,
              contactEmail: r.contactEmail,
              companyName: r.companyName,
              ownerName: r.ownerName,
            })
          ),
          total: dealsResult.total,
        }}
        pipelines={pipelines.map(toPipelineRow)}
        members={membersResult.items}
        canManageDeal={hasPermission(membership, "seller")}
        canDelete={hasPermission(membership, "manager")}
      />
    </div>
  );
}
