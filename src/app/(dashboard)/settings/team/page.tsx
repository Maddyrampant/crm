import type { Metadata } from "next";
import { requireWorkspaceRole } from "@/lib/session";
import { getWorkspaceMembers } from "@/services/workspace";
import { TeamMembersPanel } from "@/components/settings/team-members-panel";

export const metadata: Metadata = { title: "اعضای تیم" };

export default async function TeamPage() {
  const { user, workspaceId } = await requireWorkspaceRole("admin");
  const members = await getWorkspaceMembers(workspaceId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">اعضای تیم</h1>
        <p className="text-muted-foreground">
          مدیریت اعضا و نقش‌های فضای کاری
        </p>
      </div>
      <TeamMembersPanel members={members} currentUserId={user.id} />
    </div>
  );
}
