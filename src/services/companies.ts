import "server-only";

import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { companies, contacts } from "@/db/schema";

type ListOptions = {
  workspaceId: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "name" | "createdAt";
  sortDir?: "asc" | "desc";
};

export async function listCompanies(options: ListOptions) {
  const workspaceId = options.workspaceId;
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
  const sortCol = options.sortBy === "name" ? companies.name : companies.createdAt;
  const order = options.sortDir === "asc" ? asc(sortCol) : desc(sortCol);

  const conditions = [eq(companies.workspaceId, workspaceId)];
  if (options.search?.trim()) {
    const q = `%${options.search.trim()}%`;
    const searchCond = or(ilike(companies.name, q), ilike(companies.domain, q), ilike(companies.industry, q));
    if (searchCond) conditions.push(searchCond);
  }

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        company: companies,
        contactCount: count(contacts.id),
      })
      .from(companies)
      .leftJoin(contacts, eq(contacts.companyId, companies.id))
      .where(and(...conditions))
      .groupBy(companies.id)
      .orderBy(order)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ value: count() })
      .from(companies)
      .where(and(...conditions)),
  ]);

  return {
    items: rows.map((r) => ({ ...r.company, contactCount: Number(r.contactCount) })),
    total: Number(totalRow[0]?.value ?? 0),
  };
}

export async function getCompany(workspaceId: string, id: string) {
  const [company] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.workspaceId, workspaceId), eq(companies.id, id)))
    .limit(1);

  return company ?? null;
}

type CompanyInput = {
  name: string;
  domain?: string | null;
  industry?: string | null;
  website?: string | null;
  address?: string | null;
  notes?: string | null;
};

export async function createCompany(workspaceId: string, input: CompanyInput) {
  const [company] = await db
    .insert(companies)
    .values({
      workspaceId,
      name: input.name,
      domain: input.domain ?? null,
      industry: input.industry ?? null,
      website: input.website ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
    })
    .returning();

  return company;
}

export async function updateCompany(workspaceId: string, id: string, input: Partial<CompanyInput>) {
  const [company] = await db
    .update(companies)
    .set({
      name: input.name,
      domain: input.domain ?? null,
      industry: input.industry ?? null,
      website: input.website ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(companies.workspaceId, workspaceId), eq(companies.id, id)))
    .returning();

  return company ?? null;
}

export async function deleteCompany(workspaceId: string, id: string) {
  const [deleted] = await db
    .delete(companies)
    .where(and(eq(companies.workspaceId, workspaceId), eq(companies.id, id)))
    .returning({ id: companies.id });

  return deleted ?? null;
}
