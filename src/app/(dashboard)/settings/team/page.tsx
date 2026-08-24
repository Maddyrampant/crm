import type { Metadata } from "next";
import { requireWorkspaceRole } from "@/lib/session";
import { getWorkspaceMembers } from "@/services/workspace";
import { PageHeader } from "@/components/ui/page-header";
import { TeamMembersPanel } from "@/components/settings/team-members-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "اعضای تیم" };

export default async function TeamPage() {
  const { user, workspaceId } = await requireWorkspaceRole("admin");
  const membersResult = await getWorkspaceMembers(workspaceId);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "تنظیمات", href: "/settings" }, { label: "اعضای تیم" }]} />
      <PageHeader
        title="اعضای تیم"
        description="مدیریت اعضا و نقش‌های فضای کاری"
      />
      <TeamMembersPanel members={membersResult.items} currentUserId={user.id} />
    </div>
  );
}
