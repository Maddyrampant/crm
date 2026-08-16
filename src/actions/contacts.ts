"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSession, getActiveWorkspace, hasPermission } from "@/lib/session";
import * as contactsService from "@/services/contacts";
import * as companiesService from "@/services/companies";
import { logActivity, addNote, getNotes } from "@/services/activity";
import { toCompanyRow, toContactRow } from "@/lib/serialize";

const contactSchema = z.object({
  firstName: z.string().trim().min(1, "نام را وارد کنید").max(100),
  lastName: z.string().trim().max(100).nullable().optional(),
  email: z
    .string()
    .trim()
    .email("ایمیل نامعتبر است")
    .or(z.literal(""))
    .nullable()
    .optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  companyId: z.string().nullable().optional(),
  source: z
    .enum(["website", "referral", "social", "cold_call", "advertisement", "other"])
    .optional(),
  lifecycleStage: z
    .enum(["lead", "prospect", "customer", "inactive"])
    .optional(),
  ownerId: z.string().nullable().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
});

const listQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  lifecycleStage: z.enum(["lead", "prospect", "customer", "inactive"]).nullable().optional(),
  source: z
    .enum(["website", "referral", "social", "cold_call", "advertisement", "other"])
    .nullable()
    .optional(),
  ownerId: z.string().nullable().optional(),
  tagId: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
  page: z.coerce.number().int().min(1).max(10000).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z.enum(["firstName", "createdAt", "updatedAt"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

const companySchema = z.object({
  name: z.string().trim().min(1, "نام شرکت را وارد کنید").max(150),
  domain: z.string().trim().max(150).nullable().optional(),
  industry: z.string().trim().max(150).nullable().optional(),
  website: z.string().trim().max(300).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
});

const tagSchema = z.object({
  name: z.string().trim().min(1, "نام برچسب را وارد کنید").max(50),
  color: z.string().trim().max(20).default("#7367f0"),
});

const customFieldSchema = z.object({
  name: z.string().trim().min(1, "نام فیلد را وارد کنید").max(100),
  key: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z][a-z0-9_]*$/, "کلید باید با حرف انگلیسی شروع شود"),
  type: z.enum(["text", "number", "date", "select"]),
  options: z.array(z.string()).optional().default([]),
});

async function getWorkspaceContext() {
  const session = await getSession();
  if (!session?.user) return null;
  const membership = await getActiveWorkspace(session.user.id);
  if (!membership) return null;
  return { userId: session.user.id, workspaceId: membership.workspaceId, membership };
}

export async function getContactsAction(input: unknown) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };

  const parsed = listQuerySchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  }

  const result = await contactsService.listContacts({
    ...parsed.data,
    workspaceId: ctx.workspaceId,
  });

  return {
    ok: true,
    data: { items: result.items.map(toContactRow), total: result.total },
  };
}

export async function getContactAction(id: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };

  const contact = await contactsService.getContact(ctx.workspaceId, id);
  if (!contact) return { ok: false, error: "مشتری یافت نشد" };

  return { ok: true, data: contact };
}

export async function createContactAction(input: unknown) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "seller")) {
    return { ok: false, error: "شما اجازه ایجاد مشتری ندارید" };
  }

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  }

  const contact = await contactsService.createContact(ctx.workspaceId, {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName ?? null,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    companyId: parsed.data.companyId ?? null,
    source: parsed.data.source,
    lifecycleStage: parsed.data.lifecycleStage,
    ownerId: parsed.data.ownerId ?? ctx.userId,
    customFields: parsed.data.customFields ?? {},
    notes: parsed.data.notes ?? null,
  });

  await logActivity({
    workspaceId: ctx.workspaceId,
    entityType: "contact",
    entityId: contact.id,
    action: "created",
    userId: ctx.userId,
    data: { title: `${contact.firstName} ${contact.lastName ?? ""}`.trim() },
  });

  revalidatePath("/contacts");
  return { ok: true, data: toContactRow(contact) };
}

export async function updateContactAction(id: string, input: unknown) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "seller")) {
    return { ok: false, error: "شما اجازه ویرایش مشتری ندارید" };
  }

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  }

  const contact = await contactsService.updateContact(ctx.workspaceId, id, {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName ?? null,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    companyId: parsed.data.companyId ?? null,
    source: parsed.data.source,
    lifecycleStage: parsed.data.lifecycleStage,
    ownerId: parsed.data.ownerId ?? null,
    customFields: parsed.data.customFields,
    notes: parsed.data.notes ?? null,
  });

  if (!contact) return { ok: false, error: "مشتری یافت نشد" };

  await logActivity({
    workspaceId: ctx.workspaceId,
    entityType: "contact",
    entityId: id,
    action: "updated",
    userId: ctx.userId,
    data: { title: `${contact.firstName} ${contact.lastName ?? ""}`.trim() },
  });

  revalidatePath("/contacts");
  return { ok: true, data: toContactRow(contact) };
}

export async function deleteContactAction(id: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "manager")) {
    return { ok: false, error: "شما اجازه حذف مشتری ندارید" };
  }

  const deleted = await contactsService.deleteContact(ctx.workspaceId, id);
  if (!deleted) return { ok: false, error: "مشتری یافت نشد" };

  await logActivity({
    workspaceId: ctx.workspaceId,
    entityType: "contact",
    entityId: id,
    action: "deleted",
    userId: ctx.userId,
  });

  revalidatePath("/contacts");
  return { ok: true };
}

export async function addTagToContactAction(contactId: string, tagId: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "seller")) {
    return { ok: false, error: "شما اجازه تغییر برچسب‌ها را ندارید" };
  }

  return contactsService.addTagToContact(ctx.workspaceId, contactId, tagId);
}

export async function removeTagFromContactAction(contactId: string, tagId: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "seller")) {
    return { ok: false, error: "شما اجازه تغییر برچسب‌ها را ندارید" };
  }

  return contactsService.removeTagFromContact(ctx.workspaceId, contactId, tagId);
}

export async function listTagsAction() {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  const tags = await contactsService.listTags(ctx.workspaceId);
  return { ok: true, data: tags };
}

export async function createTagAction(input: unknown) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "manager")) {
    return { ok: false, error: "شما اجازه مدیریت برچسب‌ها را ندارید" };
  }

  const parsed = tagSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  }

  const tag = await contactsService.createTag(ctx.workspaceId, parsed.data.name, parsed.data.color);
  return { ok: true, data: tag };
}

export async function deleteTagAction(id: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "manager")) {
    return { ok: false, error: "شما اجازه مدیریت برچسب‌ها را ندارید" };
  }

  await contactsService.deleteTag(ctx.workspaceId, id);
  return { ok: true };
}

export async function listCustomFieldsAction() {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  const fields = await contactsService.listCustomFields(ctx.workspaceId);
  return { ok: true, data: fields };
}

export async function createCustomFieldAction(input: unknown) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "admin")) {
    return { ok: false, error: "شما اجازه مدیریت فیلدهای سفارشی را ندارید" };
  }

  const parsed = customFieldSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  }

  const field = await contactsService.createCustomField({
    workspaceId: ctx.workspaceId,
    ...parsed.data,
  });
  return { ok: true, data: field };
}

export async function deleteCustomFieldAction(id: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "admin")) {
    return { ok: false, error: "شما اجازه مدیریت فیلدهای سفارشی را ندارید" };
  }

  await contactsService.deleteCustomField(ctx.workspaceId, id);
  return { ok: true };
}

const addNoteSchema = z.object({
  entityType: z.enum([
    "contact",
    "company",
    "deal",
    "invoice",
    "appointment",
    "task",
    "payment",
  ]),
  entityId: z.string().min(1),
  body: z.string().trim().min(1, "متن یادداشت را وارد کنید").max(5000),
});

/** افزودن یادداشت به یک موجودیت (مشتری/شرکت/فروش و...). */
export async function addNoteAction(input: unknown) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };

  const parsed = addNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  }

  const note = await addNote({
    workspaceId: ctx.workspaceId,
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
    authorId: ctx.userId,
    body: parsed.data.body,
  });

  await logActivity({
    workspaceId: ctx.workspaceId,
    entityType: "note",
    entityId: note.id,
    action: "note_added",
    userId: ctx.userId,
    data: { parentType: parsed.data.entityType, parentId: parsed.data.entityId },
  });

  revalidatePath(`/contacts/${parsed.data.entityId}`);
  revalidatePath(`/pipeline`);
  return { ok: true, data: note };
}

const getNotesSchema = z.object({
  entityType: z.enum([
    "contact",
    "company",
    "deal",
    "invoice",
    "appointment",
    "task",
    "payment",
  ]),
  entityId: z.string().min(1),
});

/** فهرست یادداشت‌های یک موجودیت (جدیدترین اول). */
export async function getNotesAction(input: unknown) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };

  const parsed = getNotesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  }

  const notes = await getNotes({
    workspaceId: ctx.workspaceId,
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
  });
  return { ok: true, data: notes };
}

/* ---------- شرکت‌ها ---------- */

export async function listCompaniesAction(input: unknown) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };

  const parsed = z
    .object({
      search: z.string().trim().max(200).optional(),
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(100).optional(),
      sortBy: z.enum(["name", "createdAt"]).optional(),
      sortDir: z.enum(["asc", "desc"]).optional(),
    })
    .safeParse(input ?? {});
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  }

  const result = await companiesService.listCompanies({
    ...parsed.data,
    workspaceId: ctx.workspaceId,
  });
  return {
    ok: true,
    data: { items: result.items.map(toCompanyRow), total: result.total },
  };
}

export async function createCompanyAction(input: unknown) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "seller")) {
    return { ok: false, error: "شما اجازه ایجاد شرکت ندارید" };
  }

  const parsed = companySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  }

  const company = await companiesService.createCompany(ctx.workspaceId, {
    name: parsed.data.name,
    domain: parsed.data.domain || null,
    industry: parsed.data.industry || null,
    website: parsed.data.website || null,
    address: parsed.data.address || null,
    notes: parsed.data.notes || null,
  });

  await logActivity({
    workspaceId: ctx.workspaceId,
    entityType: "company",
    entityId: company.id,
    action: "created",
    userId: ctx.userId,
    data: { title: company.name },
  });

  revalidatePath("/companies");
  return { ok: true, data: toCompanyRow(company) };
}

export async function updateCompanyAction(id: string, input: unknown) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "seller")) {
    return { ok: false, error: "شما اجازه ویرایش شرکت ندارید" };
  }

  const parsed = companySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  }

  const company = await companiesService.updateCompany(ctx.workspaceId, id, {
    name: parsed.data.name,
    domain: parsed.data.domain || null,
    industry: parsed.data.industry || null,
    website: parsed.data.website || null,
    address: parsed.data.address || null,
    notes: parsed.data.notes || null,
  });

  if (!company) return { ok: false, error: "شرکت یافت نشد" };

  await logActivity({
    workspaceId: ctx.workspaceId,
    entityType: "company",
    entityId: id,
    action: "updated",
    userId: ctx.userId,
    data: { title: company.name },
  });

  revalidatePath("/companies");
  return { ok: true, data: toCompanyRow(company) };
}

export async function deleteCompanyAction(id: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };
  if (!hasPermission(ctx.membership, "manager")) {
    return { ok: false, error: "شما اجازه حذف شرکت را ندارید" };
  }

  const deleted = await companiesService.deleteCompany(ctx.workspaceId, id);
  if (!deleted) return { ok: false, error: "شرکت یافت نشد" };

  await logActivity({
    workspaceId: ctx.workspaceId,
    entityType: "company",
    entityId: id,
    action: "deleted",
    userId: ctx.userId,
  });

  revalidatePath("/companies");
  return { ok: true };
}

/* ---------- خروجی CSV ---------- */

export async function exportContactsCsvAction(input: unknown) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return { ok: false, error: "ابتدا وارد شوید" };

  const parsed = z
    .object({
      search: z.string().trim().max(200).optional(),
      lifecycleStage: z.enum(["lead", "prospect", "customer", "inactive"]).nullable().optional(),
      source: z
        .enum(["website", "referral", "social", "cold_call", "advertisement", "other"])
        .nullable()
        .optional(),
      ownerId: z.string().nullable().optional(),
      tagId: z.string().nullable().optional(),
    })
    .safeParse(input ?? {});
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  }

  const result = await contactsService.listContacts({
    ...parsed.data,
    workspaceId: ctx.workspaceId,
    pageSize: 100000,
    page: 1,
  });

  const header = ["نام", "نام خانوادگی", "ایمیل", "موبایل", "شرکت", "مرحله", "منبع", "برچسب‌ها"];
  const escape = (v: unknown) => {
    const s = String(v ?? "").replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = result.items.map((c) =>
    [
      c.firstName,
      c.lastName ?? "",
      c.email ?? "",
      c.phone ?? "",
      c.companyName ?? "",
      c.lifecycleStage,
      c.source,
      (c.tags ?? []).map((t) => t.name).join(" | "),
    ]
      .map(escape)
      .join(",")
  );

  return { ok: true, data: [header.join(","), ...rows].join("\n") };
}
