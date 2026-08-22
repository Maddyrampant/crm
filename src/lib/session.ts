import "server-only";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workspaceMembers, type WorkspaceMember } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ROLE_LEVEL, type RoleLevel } from "@/lib/roles";

const WORKSPACE_COOKIE = "active_workspace";

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

export function isManagerOrAbove(membership: WorkspaceMember | null | undefined): boolean {
  return hasPermission(membership, "manager");
}

export function canSeeAllData(membership: WorkspaceMember | null | undefined): boolean {
  return hasPermission(membership, "manager");
}

export async function getActiveWorkspace(userId: string) {
  const store = await cookies();
  const forcedWsId = store.get(WORKSPACE_COOKIE)?.value;

  if (forcedWsId) {
    const [match] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.workspaceId, forcedWsId)
        )
      )
      .limit(1);
    if (match) return match;
  }

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
