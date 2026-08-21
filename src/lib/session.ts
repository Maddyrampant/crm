import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workspaceMembers, type WorkspaceMember } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ROLE_LEVEL, type RoleLevel } from "@/lib/roles";

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export function hasPermission(
  membership: WorkspaceMember | null | undefined,
  required: RoleLevel
): boolean {
  if (!membership) return false;
  return ROLE_LEVEL[membership.role] >= ROLE_LEVEL[required];
}

export async function getActiveWorkspace(userId: string) {
  const memberships = await db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  return memberships[0] ?? null;
}

export async function requireWorkspace() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  const membership = await getActiveWorkspace(session.user.id);
  if (!membership) {
    redirect("/workspace/new");
  }

  return {
    user: session.user,
    workspaceId: membership.workspaceId,
    membership,
  };
}

export async function requireWorkspaceRole(
  required: RoleLevel
) {
  const ctx = await requireWorkspace();
  if (!hasPermission(ctx.membership, required)) {
    redirect("/");
  }
  return ctx;
}
