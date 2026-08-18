import "server-only";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { unlink, mkdir } from "fs/promises";
import { join } from "path";

export async function uploadAttachment(
  workspaceId: string,
  entityType: string,
  entityId: string,
  file: File,
  uploadedBy: string,
) {
  const dir = join(process.cwd(), "public", "uploads", workspaceId);
  await mkdir(dir, { recursive: true });
  const id = crypto.randomUUID();
  const filename = `${id}-${file.name}`;
  const filePath = join(dir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  const { writeFile } = await import("fs/promises");
  await writeFile(filePath, buffer);

  const storagePath = `uploads/${workspaceId}/${filename}`;
  const [row] = await db
    .insert(attachments)
    .values({
      workspaceId,
      entityType,
      entityId,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      storagePath,
      uploadedBy,
    })
    .returning();

  return row;
}

export async function listAttachments(
  workspaceId: string,
  entityType: string,
  entityId: string,
) {
  return db
    .select()
    .from(attachments)
    .where(
      and(
        eq(attachments.workspaceId, workspaceId),
        eq(attachments.entityType, entityType),
        eq(attachments.entityId, entityId),
      ),
    )
    .orderBy(attachments.createdAt);
}

export async function deleteAttachment(
  workspaceId: string,
  attachmentId: string,
) {
  const [row] = await db
    .select()
    .from(attachments)
    .where(
      and(
        eq(attachments.id, attachmentId),
        eq(attachments.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!row) throw new Error("یافت نشد");

  const filePath = join(process.cwd(), "public", row.storagePath);
  await unlink(filePath).catch(() => {});
  await db.delete(attachments).where(eq(attachments.id, attachmentId));
}
