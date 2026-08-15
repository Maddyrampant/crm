import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaceMembers, user } from "@/db/schema";

export async function getWorkspaceMembers(workspaceId: string) {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(user, eq(user.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(user.name);
}

export type WorkspaceMemberRow = Awaited<ReturnType<typeof getWorkspaceMembers>>[number];
