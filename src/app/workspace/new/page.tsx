import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { workspaceMembers, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { WorkspaceCreateForm } from "./workspace-create-form";

export default async function NewWorkspacePage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const existing = await db
    .select()
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, session.user.id))
    .limit(1);

  if (existing[0]) redirect("/");

  return <WorkspaceCreateForm />;
}
