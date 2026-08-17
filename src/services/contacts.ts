import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  companies,
  contactTags,
  contacts,
  customFields,
  tags,
  user,
  type Contact,
} from "@/db/schema";
import { getActivityFeed } from "@/services/activity";
import { dispatchWebhookEvent } from "@/services/automation";
import { dispatchRuleEvent } from "@/services/rules";

export type ContactListFilters = {
  workspaceId: string;
  search?: string;
  lifecycleStage?: Contact["lifecycleStage"] | null;
  source?: Contact["source"] | null;
  ownerId?: string | null;
  tagId?: string | null;
  companyId?: string | null;
  page?: number;
  pageSize?: number;
  sortBy?: "firstName" | "createdAt" | "updatedAt";
  sortDir?: "asc" | "desc";
};

const SORT_COLUMNS = {
  firstName: contacts.firstName,
  createdAt: contacts.createdAt,
  updatedAt: contacts.updatedAt,
} as const;

export async function listContacts(options: ContactListFilters) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
  const sortCol = SORT_COLUMNS[options.sortBy ?? "firstName"];
  const order = options.sortDir === "asc" ? asc(sortCol) : desc(sortCol);

  const conditions: SQL[] = [eq(contacts.workspaceId, options.workspaceId)];

  if (options.search?.trim()) {
    const q = `%${options.search.trim()}%`;
    const searchCond = or(
      ilike(contacts.firstName, q),
      ilike(contacts.lastName, q),
      ilike(contacts.email, q),
      ilike(contacts.phone, q),
      ilike(companies.name, q)
    );
    if (searchCond) conditions.push(searchCond);
  }
  if (options.lifecycleStage) {
    conditions.push(eq(contacts.lifecycleStage, options.lifecycleStage));
  }
  if (options.source) {
    conditions.push(eq(contacts.source, options.source));
  }
  if (options.ownerId) {
    conditions.push(eq(contacts.ownerId, options.ownerId));
  }
  if (options.companyId) {
    conditions.push(eq(contacts.companyId, options.companyId));
  }
  if (options.tagId) {
    const tagSub = db
      .select({ contactId: contactTags.contactId })
      .from(contactTags)
      .where(eq(contactTags.tagId, options.tagId));
    conditions.push(inArray(contacts.id, tagSub));
  }

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        contact: contacts,
        companyName: companies.name,
        ownerName: user.name,
      })
      .from(contacts)
      .leftJoin(companies, eq(companies.id, contacts.companyId))
      .leftJoin(user, eq(user.id, contacts.ownerId))
      .where(and(...conditions))
      .orderBy(order)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ value: count() })
      .from(contacts)
      .leftJoin(companies, eq(companies.id, contacts.companyId))
      .where(and(...conditions)),
  ]);

  const contactIds = rows.map((r) => r.contact.id);
  const tagMap = new Map<string, typeof tags.$inferSelect[]>();

  if (contactIds.length > 0) {
    const tagRows = await db
      .select({ tag: tags, contactId: contactTags.contactId })
      .from(contactTags)
      .innerJoin(tags, eq(tags.id, contactTags.tagId))
      .where(inArray(contactTags.contactId, contactIds));
    for (const row of tagRows) {
      const list = tagMap.get(row.contactId) ?? [];
      list.push(row.tag);
      tagMap.set(row.contactId, list);
    }
  }

  return {
    items: rows.map((r) => ({
      ...r.contact,
      companyName: r.companyName,
      ownerName: r.ownerName,
      tags: tagMap.get(r.contact.id) ?? [],
    })),
    total: Number(totalRow[0]?.value ?? 0),
  };
}

export async function getContact(workspaceId: string, id: string) {
  const [row] = await db
    .select({
      contact: contacts,
      company: companies,
      owner: user,
    })
    .from(contacts)
    .leftJoin(companies, eq(companies.id, contacts.companyId))
    .leftJoin(user, eq(user.id, contacts.ownerId))
    .where(and(eq(contacts.workspaceId, workspaceId), eq(contacts.id, id)))
    .limit(1);

  if (!row) return null;

  const tagsForContact = await db
    .select({ tag: tags })
    .from(contactTags)
    .innerJoin(tags, eq(tags.id, contactTags.tagId))
    .where(eq(contactTags.contactId, id));

  const fieldDefs = await db
    .select()
    .from(customFields)
    .where(eq(customFields.workspaceId, workspaceId));

  const activityResult = await getActivityFeed({
    workspaceId,
    entityType: "contact",
    entityId: id,
    limit: 20,
  });

  return {
    ...row.contact,
    company: row.company,
    owner: row.owner,
    tags: tagsForContact.map((t) => t.tag),
    customFieldDefs: fieldDefs,
    activity: activityResult.items,
  };
}

export type ContactInput = {
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyId?: string | null;
  source?: Contact["source"];
  lifecycleStage?: Contact["lifecycleStage"];
  ownerId?: string | null;
  customFields?: Record<string, unknown>;
  notes?: string | null;
};

export async function createContact(workspaceId: string, input: ContactInput) {
  const [contact] = await db
    .insert(contacts)
    .values({
      workspaceId,
      firstName: input.firstName,
      lastName: input.lastName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      companyId: input.companyId ?? null,
      source: input.source ?? "other",
      lifecycleStage: input.lifecycleStage ?? "lead",
      ownerId: input.ownerId ?? null,
      customFields: input.customFields ?? {},
      notes: input.notes ?? null,
    })
    .returning();

  dispatchWebhookEvent(workspaceId, "contact.created", { id: contact.id });
  dispatchRuleEvent(workspaceId, "contact.created", {
    entityId: contact.id,
    contactId: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    source: contact.source,
    lifecycleStage: contact.lifecycleStage,
    companyId: contact.companyId,
    ownerId: contact.ownerId,
    link: "/contacts",
  });
  return contact;
}

export async function updateContact(
  workspaceId: string,
  id: string,
  input: Partial<ContactInput>
) {
  const [contact] = await db
    .update(contacts)
    .set({
      firstName: input.firstName,
      lastName: input.lastName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      companyId: input.companyId ?? null,
      source: input.source,
      lifecycleStage: input.lifecycleStage,
      ownerId: input.ownerId ?? null,
      customFields: input.customFields,
      notes: input.notes ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(contacts.workspaceId, workspaceId), eq(contacts.id, id)))
    .returning();

  if (contact) {
    dispatchWebhookEvent(workspaceId, "contact.updated", { id: contact.id });
  }
  return contact ?? null;
}

export async function deleteContact(workspaceId: string, id: string) {
  const [deleted] = await db
    .delete(contacts)
    .where(and(eq(contacts.workspaceId, workspaceId), eq(contacts.id, id)))
    .returning({ id: contacts.id });

  if (deleted) {
    dispatchWebhookEvent(workspaceId, "contact.deleted", { id: deleted.id });
  }
  return deleted ?? null;
}

export async function addTagToContact(workspaceId: string, contactId: string, tagId: string) {
  const [contact] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.workspaceId, workspaceId)))
    .limit(1);
  if (!contact) return { ok: false as const, error: "مشتری یافت نشد" };

  const [tag] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.workspaceId, workspaceId)))
    .limit(1);
  if (!tag) return { ok: false as const, error: "برچسب یافت نشد" };

  await db.insert(contactTags).values({ contactId, tagId }).onConflictDoNothing();
  return { ok: true as const };
}

export async function removeTagFromContact(workspaceId: string, contactId: string, tagId: string) {
  const ownedContactIds = db
    .select({ id: contacts.id })
    .from(contacts)
    .where(eq(contacts.workspaceId, workspaceId));
  const ownedTagIds = db
    .select({ id: tags.id })
    .from(tags)
    .where(eq(tags.workspaceId, workspaceId));

  const deleted = await db
    .delete(contactTags)
    .where(
      and(
        eq(contactTags.contactId, contactId),
        eq(contactTags.tagId, tagId),
        inArray(contactTags.contactId, ownedContactIds),
        inArray(contactTags.tagId, ownedTagIds),
      )
    )
    .returning({ contactId: contactTags.contactId });

  return deleted.length > 0
    ? { ok: true as const }
    : { ok: false as const, error: "برچسب یافت نشد" };
}

export async function listTags(workspaceId: string) {
  return db.select().from(tags).where(eq(tags.workspaceId, workspaceId));
}

export async function createTag(workspaceId: string, name: string, color: string) {
  const [tag] = await db
    .insert(tags)
    .values({ workspaceId, name, color })
    .returning();

  return tag;
}

export async function deleteTag(workspaceId: string, id: string) {
  const [deleted] = await db
    .delete(tags)
    .where(and(eq(tags.workspaceId, workspaceId), eq(tags.id, id)))
    .returning({ id: tags.id });

  return deleted ?? null;
}

export async function listCustomFields(workspaceId: string) {
  return db.select().from(customFields).where(eq(customFields.workspaceId, workspaceId));
}

export async function createCustomField(input: {
  workspaceId: string;
  name: string;
  key: string;
  type: "text" | "number" | "date" | "select";
  options?: string[];
}) {
  const [field] = await db
    .insert(customFields)
    .values({
      workspaceId: input.workspaceId,
      name: input.name,
      key: input.key,
      type: input.type,
      options: input.options ?? [],
    })
    .returning();

  return field;
}

export async function deleteCustomField(workspaceId: string, id: string) {
  const [deleted] = await db
    .delete(customFields)
    .where(and(eq(customFields.workspaceId, workspaceId), eq(customFields.id, id)))
    .returning({ id: customFields.id });

  return deleted ?? null;
}
