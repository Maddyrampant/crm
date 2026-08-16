import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaceMembers, user, type WorkspaceMember } from "@/db/schema";

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

export type EditableRole = Exclude<WorkspaceMember["role"], "owner">;

export async function addWorkspaceMember(
  workspaceId: string,
  email: string,
  role: EditableRole
) {
  const normalized = email.trim().toLowerCase();
  const [target] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.email, normalized))
    .limit(1);
  if (!target) {
    throw new Error("کاربری با این ایمیل ثبت نشده است");
  }

  const [existing] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, target.id)
      )
    )
    .limit(1);
  if (existing) {
    throw new Error("این کاربر قبلاً عضو این فضای کاری است");
  }

  await db
    .insert(workspaceMembers)
    .values({ workspaceId, userId: target.id, role })
    .onConflictDoNothing();
  return target;
}

export async function updateMemberRole(
  workspaceId: string,
  actorUserId: string,
  targetUserId: string,
  role: EditableRole
) {
  const [target] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, targetUserId)
      )
    )
    .limit(1);
  if (!target) throw new Error("عضو یافت نشد");
  if (target.role === "owner") {
    throw new Error("نقش مالک قابل تغییر نیست");
  }
  if (targetUserId === actorUserId) {
    throw new Error("نمی‌توانید نقش خودتان را تغییر دهید");
  }
  await db
    .update(workspaceMembers)
    .set({ role })
    .where(eq(workspaceMembers.id, target.id));
}

export async function removeWorkspaceMember(
  workspaceId: string,
  actorUserId: string,
  targetUserId: string
) {
  const [target] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, targetUserId)
      )
    )
    .limit(1);
  if (!target) throw new Error("عضو یافت نشد");
  if (target.role === "owner") {
    throw new Error("مالک فضای کاری قابل حذف نیست");
  }
  if (targetUserId === actorUserId) {
    throw new Error("برای خروج خودتان، حساب را ترک نکنید");
  }
  await db.delete(workspaceMembers).where(eq(workspaceMembers.id, target.id));
}
