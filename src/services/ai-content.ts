import "server-only";

import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import {
  aiContent,
  aiContentAssignments,
  type AiContent,
} from "@/db/schema/ai-content";

type ContentType = "video_link" | "document" | "image" | "custom";
import {
  normalizePage,
  normalizePageSize,
  calculateOffset,
  buildPaginatedResult,
  type PaginatedResult,
} from "@/lib/pagination";

/* ── Content CRUD ── */

export async function listContent(
  workspaceId: string,
  params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    type?: string;
  }
): Promise<PaginatedResult<AiContent>> {
  const page = normalizePage(params?.page);
  const pageSize = normalizePageSize(params?.pageSize);
  const search = params?.search?.trim();
  const type = params?.type && params.type !== "all" ? params.type : undefined;

  const conditions = [eq(aiContent.workspaceId, workspaceId)];
  if (search) {
    conditions.push(
      or(
        ilike(aiContent.title, `%${search}%`),
        ilike(aiContent.description ?? "", `%${search}%`)
      )!
    );
  }
  if (type) {
    conditions.push(eq(aiContent.type, type as ContentType));
  }

  const where = and(...conditions);
  const [totalRow] = await db.select({ count: count() }).from(aiContent).where(where);
  const items = await db
    .select()
    .from(aiContent)
    .where(where)
    .orderBy(desc(aiContent.createdAt))
    .limit(pageSize)
    .offset(calculateOffset(page, pageSize));

  return buildPaginatedResult(items, totalRow.count, page, pageSize);
}

export async function getContent(workspaceId: string, id: string) {
  const [row] = await db
    .select()
    .from(aiContent)
    .where(and(eq(aiContent.id, id), eq(aiContent.workspaceId, workspaceId)))
    .limit(1);
  return row ?? null;
}

export async function createContent(
  workspaceId: string,
  input: {
    type?: string;
    title: string;
    description?: string;
    url: string;
    tags?: string[];
  }
) {
  const [row] = await db
    .insert(aiContent)
    .values({
      workspaceId,
      type: (input.type as ContentType) ?? "video_link",
      title: input.title,
      description: input.description ?? null,
      url: input.url,
      tags: input.tags ?? [],
    })
    .returning();
  return row;
}

export async function updateContent(
  workspaceId: string,
  id: string,
  input: {
    type?: string;
    title?: string;
    description?: string;
    url?: string;
    tags?: string[];
  }
) {
  const [row] = await db
    .update(aiContent)
    .set({ ...input, type: input.type as ContentType, updatedAt: new Date() })
    .where(and(eq(aiContent.id, id), eq(aiContent.workspaceId, workspaceId)))
    .returning();
  return row ?? null;
}

export async function deleteContent(workspaceId: string, id: string) {
  const [row] = await db
    .delete(aiContent)
    .where(and(eq(aiContent.id, id), eq(aiContent.workspaceId, workspaceId)))
    .returning({ id: aiContent.id });
  return row ?? null;
}

/* ── Assignments ── */

export async function assignContent(
  workspaceId: string,
  contentId: string,
  contactId: string,
  assignedBy: string,
  notes?: string
) {
  const [row] = await db
    .insert(aiContentAssignments)
    .values({
      workspaceId,
      contentId,
      contactId,
      assignedBy,
      notes: notes ?? null,
    })
    .returning();
  return row;
}

export async function getContentAssignments(
  workspaceId: string,
  contactId: string
) {
  return db
    .select({
      id: aiContentAssignments.id,
      status: aiContentAssignments.status,
      assignedAt: aiContentAssignments.assignedAt,
      viewedAt: aiContentAssignments.viewedAt,
      notes: aiContentAssignments.notes,
      contentTitle: aiContent.title,
      contentUrl: aiContent.url,
      contentType: aiContent.type,
    })
    .from(aiContentAssignments)
    .innerJoin(aiContent, eq(aiContent.id, aiContentAssignments.contentId))
    .where(
      and(
        eq(aiContentAssignments.workspaceId, workspaceId),
        eq(aiContentAssignments.contactId, contactId)
      )
    )
    .orderBy(desc(aiContentAssignments.assignedAt));
}

export async function markContentViewed(workspaceId: string, assignmentId: string) {
  const [row] = await db
    .update(aiContentAssignments)
    .set({ status: "viewed", viewedAt: new Date() })
    .where(
      and(
        eq(aiContentAssignments.id, assignmentId),
        eq(aiContentAssignments.workspaceId, workspaceId)
      )
    )
    .returning();
  return row ?? null;
}

export async function unassignContent(workspaceId: string, assignmentId: string) {
  const [row] = await db
    .delete(aiContentAssignments)
    .where(
      and(
        eq(aiContentAssignments.id, assignmentId),
        eq(aiContentAssignments.workspaceId, workspaceId)
      )
    )
    .returning({ id: aiContentAssignments.id });
  return row ?? null;
}
