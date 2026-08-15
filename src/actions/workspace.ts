"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { workspaces, workspaceMembers } from "@/db/schema";

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
