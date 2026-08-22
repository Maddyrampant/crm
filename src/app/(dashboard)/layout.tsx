export const dynamic = "force-dynamic";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { requireWorkspace } from "@/lib/session";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, membership, workspaceId } = await requireWorkspace();
  const [wsRows] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar role={membership.role} workspaceName={wsRows?.name ?? "ورک‌اسپیس"} />
        <SidebarInset>
          <AppHeader userName={user.name} userEmail={user.email} />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
