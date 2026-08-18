"use server";
import { requireWorkspace } from "@/lib/session";
import * as attachmentService from "@/services/attachments";
import { revalidatePath } from "next/cache";

export async function uploadAttachmentAction(
  entityType: string,
  entityId: string,
  formData: FormData,
) {
  const { workspaceId, user } = await requireWorkspace();
  const file = formData.get("file") as File;
  if (!file) return { ok: false, error: "فایل انتخاب نشده" };
  const result = await attachmentService.uploadAttachment(
    workspaceId,
    entityType,
    entityId,
    file,
    user.id,
  );
  revalidatePath("/");
  return { ok: true, data: result };
}

export async function listAttachmentsAction(
  entityType: string,
  entityId: string,
) {
  const { workspaceId } = await requireWorkspace();
  const data = await attachmentService.listAttachments(
    workspaceId,
    entityType,
    entityId,
  );
  return { ok: true, data };
}

export async function deleteAttachmentAction(attachmentId: string) {
  const { workspaceId } = await requireWorkspace();
  await attachmentService.deleteAttachment(workspaceId, attachmentId);
  revalidatePath("/");
  return { ok: true };
}
