import type { Metadata } from "next";
import { requireWorkspace, hasPermission } from "@/lib/session";
import { listSlaPoliciesAction, getActiveSlaInstancesAction } from "@/actions/sla-tracker";
import { PageHeader } from "@/components/ui/page-header";
import { SlaManager } from "@/components/sla/sla-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "پیگیری SLA" };

export default async function SlaPage() {
  const { membership } = await requireWorkspace();
  const [policies, instances] = await Promise.all([
    listSlaPoliciesAction(),
    getActiveSlaInstancesAction(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="پیگیری SLA"
        description="مدیریت سیاست‌ها و ضرب‌الاجل‌های خدمات."
      />
      <SlaManager
        initialPolicies={policies}
        initialInstances={instances}
        canManage={hasPermission(membership, "admin")}
      />
    </div>
  );
}
