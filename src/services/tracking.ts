import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { trackingTokens } from "@/db/schema";
import { logActivity } from "@/services/activity";
import { notifyWorkspace } from "@/services/notifications";

const PIXEL_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export function pixelResponse(): Response {
  return new Response(PIXEL_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}

export async function createTrackingToken(
  workspaceId: string,
  input: {
    contactId?: string;
    type: "email_open" | "pdf_view" | "link_click";
    entityType?: string;
    entityId?: string;
    meta?: string;
  }
): Promise<string> {
  const [row] = await db
    .insert(trackingTokens)
    .values({
      workspaceId,
      contactId: input.contactId ?? null,
      type: input.type,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      meta: input.meta ?? null,
    })
    .returning({ id: trackingTokens.id });
  return row.id;
}

export async function logTrackingHit(
  token: string,
  ip?: string
): Promise<boolean> {
  const [row] = await db
    .select()
    .from(trackingTokens)
    .where(eq(trackingTokens.id, token))
    .limit(1);
  if (!row) return false;

  const typeLabel =
    row.type === "email_open"
      ? "ایمیل باز شد"
      : row.type === "pdf_view"
        ? "فاکتور مشاهده شد"
        : "لینک کلیک شد";

  if (row.entityId) {
    await logActivity({
      workspaceId: row.workspaceId,
      userId: null,
      action: `tracking.${row.type}`,
      entityType: (row.entityType as "email" | "invoice" | "contact" | "deal" | "company" | "appointment" | "task" | "payment" | "note" | "sms") ?? "email",
      entityId: row.entityId,
      data: {
        contactId: row.contactId,
        token: row.id,
        ip,
      },
    });
  }

  await notifyWorkspace({
    workspaceId: row.workspaceId,
    type: "system",
    title: typeLabel,
    body: row.meta ?? undefined,
    link: row.entityType && row.entityId ? `/${row.entityType}s/${row.entityId}` : undefined,
    data: { contactId: row.contactId, trackingType: row.type },
  });

  return true;
}

export async function getTrackingStats(
  workspaceId: string,
  entityType?: string,
  entityId?: string
) {
  const { sql, and } = await import("drizzle-orm");
  const conditions = [eq(trackingTokens.workspaceId, workspaceId)];
  if (entityType) conditions.push(eq(trackingTokens.entityType, entityType));
  if (entityId) conditions.push(eq(trackingTokens.entityId, entityId));

  return db
    .select({
      type: trackingTokens.type,
      count: sql<number>`count(*)::int`,
    })
    .from(trackingTokens)
    .where(and(...conditions))
    .groupBy(trackingTokens.type);
}
