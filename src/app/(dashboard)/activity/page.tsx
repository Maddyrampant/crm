import type { Metadata } from "next";
import { requireWorkspaceRole, canSeeAllData } from "@/lib/session";
import { getActivityFeed } from "@/services/activity";
import { getWorkspaceMembers } from "@/services/workspace";
import { PageHeader } from "@/components/ui/page-header";
import { ActivityFeedPanel } from "@/components/activity/activity-feed-panel";

export const metadata: Metadata = { title: "فعالیت‌ها" };

export default async function ActivityPage() {
  const { workspaceId, membership } = await requireWorkspaceRole("seller");
  const forceUserId = canSeeAllData(membership) ? null : membership.userId;
  const [activitiesResult, membersResult] = await Promise.all([
    getActivityFeed({ workspaceId, limit: 100, userId: forceUserId }),
    getWorkspaceMembers(workspaceId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="فعالیت‌ها"
        description={forceUserId ? "فقط فعالیت‌های خودتان" : "تایم‌لاین تمام رویدادهای ثبت‌شده در فضای کاری"}
      />
      <ActivityFeedPanel
        activities={activitiesResult.items}
        members={membersResult.items.map((m) => ({ id: m.id, name: m.name }))}
      />
    </div>
  );
}
