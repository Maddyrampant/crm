import type { Metadata } from "next";
import { requireWorkspaceRole } from "@/lib/session";
import { getActivityFeed } from "@/services/activity";
import { getWorkspaceMembers } from "@/services/workspace";
import { PageHeader } from "@/components/ui/page-header";
import { ActivityFeedPanel } from "@/components/activity/activity-feed-panel";

export const metadata: Metadata = { title: "فعالیت‌ها" };

export default async function ActivityPage() {
  const { workspaceId } = await requireWorkspaceRole("seller");
  const [activitiesResult, membersResult] = await Promise.all([
    getActivityFeed({ workspaceId, limit: 100 }),
    getWorkspaceMembers(workspaceId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="فعالیت‌ها"
        description="تایم‌لاین تمام رویدادهای ثبت‌شده در فضای کاری"
      />
      <ActivityFeedPanel
        activities={activitiesResult.items}
        members={membersResult.items.map((m) => ({ id: m.id, name: m.name }))}
      />
    </div>
  );
}
