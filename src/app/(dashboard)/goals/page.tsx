import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/session";
import { listGoalsAction } from "@/actions/goals";
import { listWorkspaceMembersAction } from "@/actions/workspace";
import { PageHeader } from "@/components/ui/page-header";
import { GoalsManager } from "@/components/goals/goals-manager";

export const metadata: Metadata = { title: "اهداف فروش" };

export default async function GoalsPage() {
  const { membership } = await requireWorkspace();
  const [goalsResult, membersResult] = await Promise.all([
    listGoalsAction(),
    listWorkspaceMembersAction(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="اهداف فروش"
        description="تعریف و پیگیری اهداف فروش تیم."
      />
      <GoalsManager
        initialGoals={goalsResult.ok ? goalsResult.data : []}
        members={membersResult.ok ? membersResult.data : []}
        canManage={membership.role === "admin" || membership.role === "manager"}
      />
    </div>
  );
}
