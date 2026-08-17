import "server-only";

import { and, count, eq, ilike, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { workspaceMembers, workspaces, user, type WorkspaceMember } from "@/db/schema";
import {
  normalizePage,
  normalizePageSize,
  calculateOffset,
  buildPaginatedResult,
  type PaginatedResult,
} from "@/lib/pagination";

const baseMemberSelect = {
  id: user.id,
  name: user.name,
  email: user.email,
  role: workspaceMembers.role,
};

export type WorkspaceMemberRow = {
  id: string;
  name: string;
  email: string;
  role: WorkspaceMember["role"];
};

export async function getWorkspaceMembers(
  workspaceId: string,
  params?: { page?: number; pageSize?: number; search?: string; role?: string }
): Promise<PaginatedResult<WorkspaceMemberRow>> {
  const page = normalizePage(params?.page);
  const pageSize = normalizePageSize(params?.pageSize);
  const offset = calculateOffset(page, pageSize);

  const conditions: SQL[] = [eq(workspaceMembers.workspaceId, workspaceId)];
  if (params?.search) {
    const q = `%${params.search.trim()}%`;
    conditions.push(ilike(user.name, q));
  }
  if (params?.role) {
    conditions.push(eq(workspaceMembers.role, params.role as WorkspaceMember["role"]));
  }
  const where = and(...conditions);

  const [items, totalRow] = await Promise.all([
    db
      .select(baseMemberSelect)
      .from(workspaceMembers)
      .innerJoin(user, eq(user.id, workspaceMembers.userId))
      .where(where)
      .orderBy(user.name)
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(workspaceMembers)
      .innerJoin(user, eq(user.id, workspaceMembers.userId))
      .where(where),
  ]);

  return buildPaginatedResult(items, totalRow[0]?.count ?? 0, page, pageSize);
}

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

export async function updateWorkspaceName(workspaceId: string, name: string) {
  const [row] = await db
    .update(workspaces)
    .set({ name, updatedAt: new Date() })
    .where(eq(workspaces.id, workspaceId))
    .returning({ id: workspaces.id });
  return row ?? null;
}

export async function deleteWorkspace(workspaceId: string) {
  const [deleted] = await db
    .delete(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .returning({ id: workspaces.id });
  return deleted ?? null;
}

export async function getUserWorkspaces(userId: string) {
  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(workspaces.name);
  return rows;
}
