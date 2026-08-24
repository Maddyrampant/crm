import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireWorkspace, hasPermission } from "@/lib/session";
import { listPipelines } from "@/services/pipelines";
import { listContacts } from "@/services/contacts";
import { getWorkspaceMembers } from "@/services/workspace";
import { toPipelineRow } from "@/lib/serialize";
import { PageHeader } from "@/components/ui/page-header";
import { DealNewClient } from "./deal-new-client";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "فروش جدید" };

export default async function NewDealPage() {
  const { workspaceId, membership } = await requireWorkspace();
  if (!hasPermission(membership, "seller")) redirect("/pipeline/deals");

  const [pipelines, contactsResult, membersResult] = await Promise.all([
    listPipelines(workspaceId),
    listContacts({ workspaceId, pageSize: 200, sortBy: "firstName", sortDir: "asc" }),
    getWorkspaceMembers(workspaceId),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "فروشها", href: "/pipeline/deals" }, { label: "فروش جدید" }]} />
      <PageHeader
        title="فروش جدید"
        description="اطلاعات فرصت فروش جدید را وارد کنید."
      />
      <DealNewClient
        pipelines={pipelines.map(toPipelineRow)}
        contacts={contactsResult.items.map((c) => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName ?? ""}`.trim(),
        }))}
        members={membersResult.items}
      />
    </div>
  );
}
