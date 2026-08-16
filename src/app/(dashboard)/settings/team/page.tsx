import type { Metadata } from "next";
import { requireWorkspaceRole } from "@/lib/session";
import { getWorkspaceMembers } from "@/services/workspace";
import { PageHeader } from "@/components/ui/page-header";
import { TeamMembersPanel } from "@/components/settings/team-members-panel";

export const metadata: Metadata = { title: "اعضای تیم" };

export default async function TeamPage() {
  const { user, workspaceId } = await requireWorkspaceRole("admin");
  const members = await getWorkspaceMembers(workspaceId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="اعضای تیم"
        description="مدیریت اعضا و نقش‌های فضای کاری"
      />
      <TeamMembersPanel members={members} currentUserId={user.id} />
    </div>
  );
}
