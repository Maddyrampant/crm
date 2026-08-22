"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSession, requireWorkspaceRole } from "@/lib/session";
import { db } from "@/db";
import { workspaces, workspaceMembers } from "@/db/schema";
import {
  addWorkspaceMember,
  removeWorkspaceMember,
  updateMemberRole,
  updateWorkspaceName,
  deleteWorkspace,
  getUserWorkspaces,
  type EditableRole,
} from "@/services/workspace";

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "نام ورک‌اسپیس را وارد کنید").max(60),
});

export async function createWorkspaceAction(
  _prev: unknown,
  formData: FormData
) {
  const session = await getSession();
  if (!session?.user) return { error: "ابتدا وارد شوید" };

  const parsed = createWorkspaceSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  }

  const existing = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.ownerId, session.user.id))
    .limit(1);
  if (existing[0]) {
    redirect("/");
  }

  const slugBase =
    parsed.data.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workspace";
  const slug = `${slugBase}-${session.user.id.slice(0, 6)}`;

  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: parsed.data.name,
      slug,
      ownerId: session.user.id,
    })
    .returning({ id: workspaces.id });

  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId: session.user.id,
    role: "owner",
  });

  redirect("/");
}

const MEMBER_ROLE_VALUES = ["admin", "manager", "seller", "viewer"] as const;

const addMemberSchema = z.object({
  email: z.string().trim().email("ایمیل معتبر نیست"),
  role: z.enum(MEMBER_ROLE_VALUES),
});

export async function addWorkspaceMemberAction(raw: unknown) {
  const { user, workspaceId } = await requireWorkspaceRole("admin");
  const parsed = addMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  }
  try {
    const member = await addWorkspaceMember(
      workspaceId,
      parsed.data.email,
      parsed.data.role as EditableRole
    );
    revalidatePath("/settings");
    revalidatePath("/settings/team");
    return { ok: true, member, actorName: user.name };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "خطا در افزودن عضو" };
  }
}

export async function updateMemberRoleAction(
  userId: string,
  role: EditableRole
) {
  const { user, workspaceId } = await requireWorkspaceRole("admin");
  if (!MEMBER_ROLE_VALUES.includes(role as (typeof MEMBER_ROLE_VALUES)[number])) {
    return { ok: false, error: "نقش نامعتبر است" };
  }
  try {
    await updateMemberRole(workspaceId, user.id, userId, role);
    revalidatePath("/settings");
    revalidatePath("/settings/team");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "خطا در تغییر نقش" };
  }
}

export async function removeWorkspaceMemberAction(userId: string) {
  const { user, workspaceId } = await requireWorkspaceRole("admin");
  try {
    await removeWorkspaceMember(workspaceId, user.id, userId);
    revalidatePath("/settings");
    revalidatePath("/settings/team");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "خطا در حذف عضو" };
  }
}

const updateNameSchema = z.object({
  name: z.string().trim().min(1, "نام ورک‌اسپیس را وارد کنید").max(60),
});

export async function updateWorkspaceNameAction(raw: unknown) {
  const { workspaceId } = await requireWorkspaceRole("owner");
  const parsed = updateNameSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  }
  const row = await updateWorkspaceName(workspaceId, parsed.data.name);
  if (!row) return { ok: false, error: "ورک‌اسپیس یافت نشد" };
  revalidatePath("/settings/workspace");
  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteWorkspaceAction() {
  const { workspaceId } = await requireWorkspaceRole("owner");
  const row = await deleteWorkspace(workspaceId);
  if (!row) return { ok: false, error: "ورک‌اسپیس یافت نشد" };
  redirect("/workspace/new");
}

export async function getUserWorkspacesAction() {
  const session = await getSession();
  if (!session?.user) return { ok: false, data: [] };
  const workspaces = await getUserWorkspaces(session.user.id);
  return { ok: true, data: workspaces };
}
