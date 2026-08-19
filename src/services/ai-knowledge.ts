import "server-only";

import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiKnowledge, type AiKnowledge } from "@/db/schema/ai-knowledge";

type KnowledgeCategory = "sales_advice" | "product_info" | "support_faq" | "objection_handling" | "follow_up" | "custom";
import {
  normalizePage,
  normalizePageSize,
  calculateOffset,
  buildPaginatedResult,
  type PaginatedResult,
} from "@/lib/pagination";

export async function listKnowledge(
  workspaceId: string,
  params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
  }
): Promise<PaginatedResult<AiKnowledge>> {
  const page = normalizePage(params?.page);
  const pageSize = normalizePageSize(params?.pageSize);
  const search = params?.search?.trim();
  const category = params?.category && params.category !== "all" ? params.category : undefined;

  const conditions = [eq(aiKnowledge.workspaceId, workspaceId)];
  if (search) {
    conditions.push(
      or(
        ilike(aiKnowledge.title, `%${search}%`),
        ilike(aiKnowledge.content, `%${search}%`)
      )!
    );
  }
  if (category) {
    conditions.push(eq(aiKnowledge.category, category as KnowledgeCategory));
  }

  const where = and(...conditions);

  const [totalRow] = await db
    .select({ count: count() })
    .from(aiKnowledge)
    .where(where);

  const items = await db
    .select()
    .from(aiKnowledge)
    .where(where)
    .orderBy(desc(aiKnowledge.createdAt))
    .limit(pageSize)
    .offset(calculateOffset(page, pageSize));

  return buildPaginatedResult(items, totalRow.count, page, pageSize);
}

export async function getKnowledge(workspaceId: string, id: string) {
  const [row] = await db
    .select()
    .from(aiKnowledge)
    .where(and(eq(aiKnowledge.id, id), eq(aiKnowledge.workspaceId, workspaceId)))
    .limit(1);
  return row ?? null;
}

export async function createKnowledge(
  workspaceId: string,
  input: {
    category?: string;
    title: string;
    content: string;
    tags?: string[];
  }
) {
  const [row] = await db
    .insert(aiKnowledge)
    .values({
      workspaceId,
      category: (input.category as KnowledgeCategory) ?? "custom",
      title: input.title,
      content: input.content,
      tags: input.tags ?? [],
    })
    .returning();
  return row;
}

export async function updateKnowledge(
  workspaceId: string,
  id: string,
  input: {
    category?: string;
    title?: string;
    content?: string;
    tags?: string[];
    active?: boolean;
  }
) {
  const [row] = await db
    .update(aiKnowledge)
    .set({
      ...input,
      category: input.category as KnowledgeCategory,
      updatedAt: new Date(),
    })
    .where(and(eq(aiKnowledge.id, id), eq(aiKnowledge.workspaceId, workspaceId)))
    .returning();
  return row ?? null;
}

export async function deleteKnowledge(workspaceId: string, id: string) {
  const [row] = await db
    .delete(aiKnowledge)
    .where(and(eq(aiKnowledge.id, id), eq(aiKnowledge.workspaceId, workspaceId)))
    .returning({ id: aiKnowledge.id });
  return row ?? null;
}

export async function searchKnowledge(workspaceId: string, query: string, limit = 5) {
  const rows = await db
    .select()
    .from(aiKnowledge)
    .where(
      and(
        eq(aiKnowledge.workspaceId, workspaceId),
        eq(aiKnowledge.active, true),
        or(
          ilike(aiKnowledge.title, `%${query}%`),
          ilike(aiKnowledge.content, `%${query}%`),
          sql`${aiKnowledge.tags}::text ILIKE ${`%${query}%`}`
        )
      )
    )
    .limit(limit);
  return rows;
}
