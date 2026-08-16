import { NextRequest } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";import { db } from "@/db";
import {
  companies,
  contacts,
  deals,
  invoices,
  pipelines,
  stages,
  type Contact,
  type Deal,
  type InvoiceStatus,
} from "@/db/schema";
import { verifyApiKey } from "@/services/automation";
import {
  createInvoice,
  recordPayment,
  updateInvoiceStatus,
} from "@/services/invoices";
import { checkRateLimit } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ slug: string[] }> };

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

function unauthorized() {
  return json({ error: "Invalid API key" }, 401);
}

function rateLimited(retryAfterMs: number) {
  return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
    status: 429,
    headers: { "retry-after": String(Math.ceil(retryAfterMs / 1000)) },
  });
}

function tryParse<T>(schema: z.ZodType<T>, body: unknown) {
  const result = schema.safeParse(body);
  return result.success
    ? { ok: true as const, data: result.data }
    : { ok: false as const, issues: result.error.issues };
}

function validationError(issues: z.ZodIssue[]) {
  return json({ error: "Validation failed", issues }, 422);
}

const CONTACT_SOURCES: Contact["source"][] = [
  "website",
  "referral",
  "social",
  "cold_call",
  "advertisement",
  "other",
];

const LIFECYCLE_STAGES: Contact["lifecycleStage"][] = [
  "lead",
  "prospect",
  "customer",
  "inactive",
];

const DEAL_STATUSES: Deal["status"][] = ["open", "won", "lost"];

const INVOICE_STATUSES: InvoiceStatus[] = [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
];

const contactSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  companyId: z.string().optional().nullable(),
  source: z.enum(CONTACT_SOURCES as [string, ...string[]]).optional(),
  lifecycleStage: z.enum(LIFECYCLE_STAGES as [string, ...string[]]).optional(),
  notes: z.string().optional().nullable(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

const dealSchema = z.object({
  title: z.string().trim().min(1).optional(),
  amount: z.coerce.number().min(0).optional(),
  stageId: z.string().optional(),
  contactId: z.string().optional().nullable(),
  closeDate: z.string().datetime({ offset: true }).optional().nullable(),
  status: z.enum(DEAL_STATUSES as [string, ...string[]]).optional(),
  lostReason: z.string().optional().nullable(),
});

const companySchema = z.object({
  name: z.string().trim().min(1).optional(),
  domain: z.string().trim().optional().nullable(),
  industry: z.string().trim().optional().nullable(),
  website: z.string().url().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const invoicePatchSchema = z.object({
  status: z.enum(INVOICE_STATUSES as [string, ...string[]]).optional(),
});

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.enum(["cash", "card", "transfer", "check", "other"]).default("cash"),
  reference: z.string().trim().max(200).optional(),
  paidAt: z.string().datetime({ offset: true }).optional(),
});

async function authed(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return verifyApiKey(token);
}

async function resolveContact(workspaceId: string, contactId?: string | null) {
  if (!contactId) return null;
  const [row] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.workspaceId, workspaceId)))
    .limit(1);
  return row?.id ?? null;
}

/** مرحله معتبر ورک‌اسپیس (همراه pipelineId)، یا اولین مرحله فانل پیش‌فرض */
async function resolveStage(workspaceId: string, stageId?: string) {
  if (stageId) {
    const [row] = await db
      .select({ id: stages.id, pipelineId: stages.pipelineId })
      .from(stages)
      .innerJoin(pipelines, eq(pipelines.id, stages.pipelineId))
      .where(and(eq(stages.id, stageId), eq(pipelines.workspaceId, workspaceId)))
      .limit(1);
    return row ? { stageId: row.id, pipelineId: row.pipelineId } : null;
  }
  const [row] = await db
    .select({ id: stages.id, pipelineId: stages.pipelineId })
    .from(stages)
    .innerJoin(pipelines, eq(pipelines.id, stages.pipelineId))
    .where(
      and(eq(pipelines.workspaceId, workspaceId), eq(pipelines.isDefault, true))
    )
    .orderBy(asc(stages.orderIndex))
    .limit(1);
  return row ? { stageId: row.id, pipelineId: row.pipelineId } : null;
}

/* ─────────────── GET ─────────────── */

export async function GET(req: NextRequest, { params }: Ctx) {
  const workspaceId = await authed(req);
  if (!workspaceId) return unauthorized();

  const rl = checkRateLimit(`v1:${workspaceId}`);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const { slug = [] } = await params;
  const resource = slug[0];
  const id = slug[1];
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50), 200);
  const offset = Math.max(Number(req.nextUrl.searchParams.get("offset") ?? 0), 0);

  if (resource === "contacts") {
    if (id) {
      const [row] = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)))
        .limit(1);
      return row ? json({ ok: true, data: row }) : json({ error: "Not found" }, 404);
    }
    const rows = await db
      .select()
      .from(contacts)
      .where(eq(contacts.workspaceId, workspaceId))
      .limit(limit)
      .offset(offset);
    return json({ ok: true, data: rows });
  }

  if (resource === "deals") {
    if (id) {
      const [row] = await db
        .select()
        .from(deals)
        .where(and(eq(deals.id, id), eq(deals.workspaceId, workspaceId)))
        .limit(1);
      return row ? json({ ok: true, data: row }) : json({ error: "Not found" }, 404);
    }
    const rows = await db
      .select()
      .from(deals)
      .where(eq(deals.workspaceId, workspaceId))
      .orderBy(asc(deals.createdAt))
      .limit(limit)
      .offset(offset);
    return json({ ok: true, data: rows });
  }

  if (resource === "invoices") {
    if (id) {
      const [row] = await db
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, id), eq(invoices.workspaceId, workspaceId)))
        .limit(1);
      return row ? json({ ok: true, data: row }) : json({ error: "Not found" }, 404);
    }
    const rows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.workspaceId, workspaceId))
      .limit(limit)
      .offset(offset);
    return json({ ok: true, data: rows });
  }

  if (resource === "companies") {
    const rows = await db
      .select()
      .from(companies)
      .where(eq(companies.workspaceId, workspaceId))
      .limit(limit)
      .offset(offset);
    return json({ ok: true, data: rows });
  }

  return json({ error: "Resource not found" }, 404);
}

/* ─────────────── POST ─────────────── */

export async function POST(req: NextRequest, { params }: Ctx) {
  const workspaceId = await authed(req);
  if (!workspaceId) return unauthorized();

  const rl = checkRateLimit(`v1:${workspaceId}`, 30);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const { slug = [] } = await params;
  const resource = slug[0];
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ error: "Invalid JSON body" }, 400);

  if (resource === "contacts") {
    const parsed = tryParse(contactSchema, body);
    if (!parsed.ok) return validationError(parsed.issues);
    if (!parsed.data.firstName) return json({ error: "firstName is required" }, 422);
    const [row] = await db
      .insert(contacts)
      .values({
        workspaceId,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName ?? null,
        email: parsed.data.email ?? null,
        phone: parsed.data.phone ?? null,
        companyId: parsed.data.companyId ?? null,
        source: (parsed.data.source as Contact["source"]) ?? "other",
        lifecycleStage:
          (parsed.data.lifecycleStage as Contact["lifecycleStage"]) ?? "lead",
        notes: parsed.data.notes ?? null,
        customFields: parsed.data.customFields ?? {},
      })
      .returning();
    return json({ ok: true, data: row }, 201);
  }

  if (resource === "deals") {
    const parsed = tryParse(dealSchema, body);
    if (!parsed.ok) return validationError(parsed.issues);
    if (!parsed.data.title) return json({ error: "title is required" }, 422);
    const stage = await resolveStage(workspaceId, parsed.data.stageId);
    if (!stage) {
      return json({ error: "No stage available in workspace" }, 422);
    }
    const contactId = await resolveContact(workspaceId, parsed.data.contactId);
    const [row] = await db
      .insert(deals)
      .values({
        workspaceId,
        title: parsed.data.title,
        amount: String(parsed.data.amount ?? 0),
        pipelineId: stage.pipelineId,
        stageId: stage.stageId,
        contactId,
        status: (parsed.data.status as Deal["status"]) ?? "open",
        closeDate: parsed.data.closeDate ? new Date(parsed.data.closeDate) : null,
        lostReason: parsed.data.lostReason ?? null,
      })
      .returning();
    return json({ ok: true, data: row }, 201);
  }

  if (resource === "invoices" && slug.length === 1) {
    const input = {
      contactId: body.contactId,
      dueAt: body.dueAt,
      discount: body.discount,
      taxRate: body.taxRate,
      notes: body.notes,
      items: body.items,
    };
    try {
      const row = await createInvoice(workspaceId, null, input);
      return json({ ok: true, data: row }, 201);
    } catch (err) {
      return err instanceof z.ZodError
        ? validationError(err.issues)
        : json({ error: "Failed to create invoice" }, 500);
    }
  }

  if (resource === "invoices" && slug[2] === "payments") {
    const invoiceId = slug[1];
    const parsed = tryParse(paymentSchema, body);
    if (!parsed.ok) return validationError(parsed.issues);
    const result = await recordPayment(workspaceId, null, invoiceId, parsed.data);
    if (!result) return json({ error: "Invoice not found" }, 404);
    return json({ ok: true, data: result }, 201);
  }

  if (resource === "companies") {
    const parsed = tryParse(companySchema, body);
    if (!parsed.ok) return validationError(parsed.issues);
    if (!parsed.data.name) return json({ error: "name is required" }, 422);
    const [row] = await db
      .insert(companies)
      .values({
        workspaceId,
        name: parsed.data.name,
        domain: parsed.data.domain ?? null,
        industry: parsed.data.industry ?? null,
        website: parsed.data.website ?? null,
        address: parsed.data.address ?? null,
        notes: parsed.data.notes ?? null,
      })
      .returning();
    return json({ ok: true, data: row }, 201);
  }

  return json({ error: "Resource not found" }, 404);
}

/* ─────────────── PATCH ─────────────── */

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const workspaceId = await authed(req);
  if (!workspaceId) return unauthorized();

  const rl = checkRateLimit(`v1:${workspaceId}`, 30);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const { slug = [] } = await params;
  const resource = slug[0];
  const id = slug[1];
  if (!id) return json({ error: "Missing id" }, 422);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ error: "Invalid JSON body" }, 400);

  if (resource === "contacts") {
    const parsed = tryParse(contactSchema, body);
    if (!parsed.ok) return validationError(parsed.issues);
    const d = parsed.data;
    const [row] = await db
      .update(contacts)
      .set({
        ...(d.firstName !== undefined ? { firstName: d.firstName } : {}),
        ...(d.lastName !== undefined ? { lastName: d.lastName } : {}),
        ...(d.email !== undefined ? { email: d.email } : {}),
        ...(d.phone !== undefined ? { phone: d.phone } : {}),
        ...(d.companyId !== undefined ? { companyId: d.companyId } : {}),
        ...(d.source !== undefined ? { source: d.source as Contact["source"] } : {}),
        ...(d.lifecycleStage !== undefined
          ? { lifecycleStage: d.lifecycleStage as Contact["lifecycleStage"] }
          : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
        ...(d.customFields !== undefined ? { customFields: d.customFields } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)))
      .returning();
    return row ? json({ ok: true, data: row }) : json({ error: "Not found" }, 404);
  }

  if (resource === "deals") {
    const parsed = tryParse(dealSchema, body);
    if (!parsed.ok) return validationError(parsed.issues);
    const d = parsed.data;
    const stage = d.stageId ? await resolveStage(workspaceId, d.stageId) : undefined;
    if (d.stageId && !stage) return json({ error: "Invalid stage" }, 422);
    const contactId = await resolveContact(workspaceId, d.contactId);
    const wonAt =
      d.status === "won" ? new Date() : d.status === "open" ? null : undefined;
    const [row] = await db
      .update(deals)
      .set({
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.amount !== undefined ? { amount: String(d.amount) } : {}),
        ...(stage !== undefined && stage ? { stageId: stage.stageId } : {}),
        ...(d.contactId !== undefined ? { contactId } : {}),
        ...(d.closeDate !== undefined
          ? { closeDate: d.closeDate ? new Date(d.closeDate) : null }
          : {}),
        ...(d.status !== undefined
          ? { status: d.status as Deal["status"] }
          : {}),
        ...(wonAt !== undefined ? { wonAt } : {}),
        ...(d.lostReason !== undefined ? { lostReason: d.lostReason } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(deals.id, id), eq(deals.workspaceId, workspaceId)))
      .returning();
    return row ? json({ ok: true, data: row }) : json({ error: "Not found" }, 404);
  }

  if (resource === "invoices") {
    const parsed = tryParse(invoicePatchSchema, body);
    if (!parsed.ok) return validationError(parsed.issues);
    if (!parsed.data.status) return json({ error: "No updatable fields" }, 422);
    const row = await updateInvoiceStatus(
      workspaceId,
      null,
      id,
      parsed.data.status as InvoiceStatus
    );
    return row ? json({ ok: true, data: row }) : json({ error: "Not found" }, 404);
  }

  if (resource === "companies") {
    const parsed = tryParse(companySchema, body);
    if (!parsed.ok) return validationError(parsed.issues);
    const d = parsed.data;
    const [row] = await db
      .update(companies)
      .set({
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.domain !== undefined ? { domain: d.domain } : {}),
        ...(d.industry !== undefined ? { industry: d.industry } : {}),
        ...(d.website !== undefined ? { website: d.website } : {}),
        ...(d.address !== undefined ? { address: d.address } : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(companies.id, id), eq(companies.workspaceId, workspaceId)))
      .returning();
    return row ? json({ ok: true, data: row }) : json({ error: "Not found" }, 404);
  }

  return json({ error: "Resource not found" }, 404);
}

/* ─────────────── DELETE ─────────────── */

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const workspaceId = await authed(req);
  if (!workspaceId) return unauthorized();

  const rl = checkRateLimit(`v1:${workspaceId}`, 30);
  if (!rl.ok) return rateLimited(rl.retryAfterMs);

  const { slug = [] } = await params;
  const resource = slug[0];
  const id = slug[1];
  if (!id) return json({ error: "Missing id" }, 422);

  const tables: Record<
    string,
    typeof contacts | typeof deals | typeof invoices | typeof companies
  > = { contacts, deals, invoices, companies };
  const table = tables[resource];
  if (!table) return json({ error: "Resource not found" }, 404);

  const [row] = await db
    .delete(table)
    .where(and(eq(table.id, id), eq(table.workspaceId, workspaceId)))
    .returning({ id: table.id });
  return row ? json({ ok: true, data: { id } }) : json({ error: "Not found" }, 404);
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
