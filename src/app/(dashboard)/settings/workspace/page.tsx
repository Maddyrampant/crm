import type { Metadata } from "next";
import { requireWorkspaceRole } from "@/lib/session";
import { getWorkspaceMembers } from "@/services/workspace";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspaceInfoPanel } from "./workspace-info-panel";
import { TeamMembersPanel } from "@/components/settings/team-members-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata: Metadata = { title: "مدیریت ورک‌اسپیس" };

export default async function WorkspacePage() {
  const { user, workspaceId, membership } = await requireWorkspaceRole("admin");

  const [workspaceRows, membersResult] = await Promise.all([
    db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1),
    getWorkspaceMembers(workspaceId),
  ]);

  const workspace = workspaceRows[0];
  if (!workspace) return null;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "تنظیمات", href: "/settings" }, { label: "مدیریت ورک‌اسپیس" }]} />
      <PageHeader
        title="مدیریت ورک‌اسپیس"
        description="اطلاعات، اعضا و تنظیمات فضای کاری"
      />

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">اطلاعات</TabsTrigger>
          <TabsTrigger value="members">اعضا</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <WorkspaceInfoPanel
            workspace={{
              id: workspace.id,
              name: workspace.name,
              slug: workspace.slug,
              ownerId: workspace.ownerId,
              createdAt: workspace.createdAt,
            }}
            currentUserId={user.id}
            userRole={membership.role}
          />
        </TabsContent>

        <TabsContent value="members">
          <TeamMembersPanel
            members={membersResult.items}
            currentUserId={user.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
