import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { GoalList } from "@/components/goals/goal-list";
import { GoalForm } from "@/components/goals/goal-form";
import { listGoalsAction } from "@/actions/goals";
import { RefreshWrapper } from "@/components/shared/refresh-wrapper";

export const metadata: Metadata = { title: "اهداف فروش" };

export default async function GoalsPage() {
  const res = await listGoalsAction();
  const goals = res.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="اهداف فروش"
        description="تعریف و پیگیری اهداف فروش تیم"
      />
      <RefreshWrapper>
        {(refresh) => (
          <>
            <GoalForm onCreated={refresh} />
            <GoalList goals={goals} onRefresh={refresh} />
          </>
        )}
      </RefreshWrapper>
    </div>
  );
}
