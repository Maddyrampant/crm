import "server-only";

import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { companies, contacts, contactTags, pipelines, stages, tags, type Contact, type Deal } from "@/db/schema";
import { createCompany } from "./companies";
import { createContact, createTag } from "./contacts";
import { createDeal } from "./deals";
import {
  normalizePersian,
  toEnglishDigits,
  type ImportEntity,
  type ImportSummary,
  type ParsedCsv,
  type ParsedRow,
} from "@/lib/import-csv";

const SOURCE_MAP: Record<string, Contact["source"]> = {
  website: "website",
  site: "website",
  وب: "website",
  وبسایت: "website",
  "وب سایت": "website",
  سایت: "website",
  referral: "referral",
  reference: "referral",
  معرفی: "referral",
  "معرفی دوستان": "referral",
  social: "social",
  شبکه: "social",
  "شبکه های اجتماعی": "social",
  اینستاگرام: "social",
  cold_call: "cold_call",
  سرد: "cold_call",
  "تماس سرد": "cold_call",
  advertisement: "advertisement",
  تبلیغات: "advertisement",
  آگهی: "advertisement",
  other: "other",
  سایر: "other",
};

const LIFECYCLE_MAP: Record<string, Contact["lifecycleStage"]> = {
  lead: "lead",
  سرنخ: "lead",
  جدید: "lead",
  prospect: "prospect",
  فرصت: "prospect",
  مذاکره: "prospect",
  customer: "customer",
  مشتری: "customer",
  inactive: "inactive",
  غیرفعال: "inactive",
};

const DEAL_STATUS_MAP: Record<string, Deal["status"]> = {
  open: "open",
  باز: "open",
  مذاکره: "open",
  won: "won",
  "بسته شده": "won",
  بسته: "won",
  برنده: "won",
  lost: "lost",
  باخته: "lost",
  "از دست رفته": "lost",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseAmount(raw: string | undefined): number | null {
  if (!raw || !raw.trim()) return 0;
  const cleaned = toEnglishDigits(raw).replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseIsoDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const s = toEnglishDigits(raw).trim();
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!m) return null;
  const year = +m[1];
  if (year < 2000 || year > 2100) return null;
  const date = new Date(Date.UTC(year, +m[2] - 1, +m[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function detectEntity(values: ParsedRow["values"]): ImportEntity {
  const type = normalizePersian(values.type ?? "");
  if (type.includes("شرکت") || type === "company") return "company";
  if (type.includes("فرصت") || type.includes("فروش") || type === "deal") return "deal";
  if (type.includes("مشتری") || type.includes("تماس") || type === "contact") return "contact";
  const hasName = Boolean(values.firstName || values.lastName);
  if ((values.dealTitle ?? "").trim()) return "deal";
  if (!hasName && (values.companyName ?? "").trim()) return "company";
  return "contact";
}

export async function importCsvData(
  workspaceId: string,
  parsed: ParsedCsv,
  actorUserId?: string | null
): Promise<ImportSummary> {
  if (parsed.headers.length === 0) {
    throw new Error("سربرگ CSV ناشناخته است؛ از فایل قالب استفاده کنید");
  }
  if (parsed.rows.length === 0) {
    throw new Error("فایل CSV ردیف داده‌ای ندارد");
  }

  const summary: ImportSummary = {
    totalRows: parsed.rows.length,
    created: { companies: 0, contacts: 0, deals: 0 },
    errors: [],
  };

  const [defaultPipeline] = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.workspaceId, workspaceId))
    .orderBy(desc(pipelines.isDefault), asc(pipelines.createdAt))
    .limit(1);

  const stageRows = defaultPipeline
    ? await db
        .select()
        .from(stages)
        .where(eq(stages.pipelineId, defaultPipeline.id))
        .orderBy(asc(stages.orderIndex))
    : [];
  const firstStage = stageRows[0] ?? null;
  const stageByKey = new Map(stageRows.map((s) => [normalizePersian(s.name), s.id]));

  const existingCompanies = await db
    .select()
    .from(companies)
    .where(eq(companies.workspaceId, workspaceId));
  const companyIdByKey = new Map(
    existingCompanies.map((c) => [normalizePersian(c.name), c.id])
  );

  const existingContacts = await db
    .select({ id: contacts.id, email: contacts.email })
    .from(contacts)
    .where(eq(contacts.workspaceId, workspaceId));
  const contactIdByEmail = new Map(
    existingContacts
      .filter((c) => c.email)
      .map((c) => [(c.email as string).toLowerCase(), c.id])
  );

  const existingTags = await db
    .select()
    .from(tags)
    .where(eq(tags.workspaceId, workspaceId));
  const tagIdByKey = new Map(existingTags.map((t) => [normalizePersian(t.name), t.id]));

  async function getOrCreateCompany(
    row: ParsedRow["values"]
  ): Promise<string | null> {
    const name = (row.companyName ?? "").trim();
    if (!name) return null;
    const key = normalizePersian(name);
    const existing = companyIdByKey.get(key);
    if (existing) return existing;
    const company = await createCompany(workspaceId, {
      name,
      website: (row.companyWebsite ?? "").trim() || null,
      industry: (row.companyIndustry ?? "").trim() || null,
      notes: (row.notes ?? "").trim() || null,
    });
    companyIdByKey.set(key, company.id);
    summary.created.companies += 1;
    return company.id;
  }

  async function getOrCreateTag(name: string): Promise<string | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const key = normalizePersian(trimmed);
    const existing = tagIdByKey.get(key);
    if (existing) return existing;
    const tag = await createTag(workspaceId, trimmed, "#6b7280");
    tagIdByKey.set(key, tag.id);
    return tag.id;
  }

  for (const row of parsed.rows) {
    const entity = detectEntity(row.values);
    const recordError = (message: string) =>
      summary.errors.push({ row: row.rowNumber, entity, message });

    try {
      if (entity === "company") {
        const name = (row.values.companyName ?? "").trim();
        if (!name) {
          recordError("نام شرکت الزامی است");
          continue;
        }
        await getOrCreateCompany(row.values);
        continue;
      }

      if (entity === "contact") {
        const firstName = (row.values.firstName ?? "").trim();
        const lastName = (row.values.lastName ?? "").trim();
        const email = (row.values.email ?? "").trim().toLowerCase();
        const phone = (row.values.phone ?? "").trim();
        const name = firstName || lastName;
        if (!name && !email) {
          recordError("حداقل نام یا ایمیل را وارد کنید");
          continue;
        }
        if (email && !EMAIL_RE.test(email)) {
          recordError("ایمیل نامعتبر است");
          continue;
        }

        const companyId = await getOrCreateCompany(row.values);
        const existingContact = email ? contactIdByEmail.get(email) : null;

        if (existingContact) {
          const tagIds = (
            await Promise.all(
              (row.values.tags ?? "")
                .split(/[;،,]/)
                .map((t) => getOrCreateTag(t))
            )
          ).filter((t): t is string => !!t);
          if (tagIds.length > 0) {
            await db
              .insert(contactTags)
              .values(tagIds.map((tagId) => ({ contactId: existingContact, tagId })))
              .onConflictDoNothing();
          }
          continue;
        }

        const contact = await createContact(workspaceId, {
          firstName: firstName || lastName || (email ? email.split("@")[0] : ""),
          lastName: lastName || null,
          email: email || null,
          phone: phone || null,
          companyId,
          source: SOURCE_MAP[normalizePersian(row.values.source ?? "")] ?? "other",
          lifecycleStage: LIFECYCLE_MAP[normalizePersian(row.values.lifecycle ?? "")] ?? "lead",
          ownerId: actorUserId ?? null,
          notes: (row.values.notes ?? "").trim() || null,
        });

        const tagIds = (
          await Promise.all(
            (row.values.tags ?? "")
              .split(/[;،,]/)
              .map((t) => getOrCreateTag(t))
          )
        ).filter((t): t is string => !!t);
        if (tagIds.length > 0) {
          await db
            .insert(contactTags)
            .values(tagIds.map((tagId) => ({ contactId: contact.id, tagId })))
            .onConflictDoNothing();
        }

        if (email) contactIdByEmail.set(email, contact.id);
        summary.created.contacts += 1;
        continue;
      }

      const title = (row.values.dealTitle ?? "").trim();
      if (!title) {
        recordError("عنوان فرصت الزامی است");
        continue;
      }
      if (!defaultPipeline || !firstStage) {
        recordError("برای ایمپورت فرصت‌ها ابتدا یک فانل با مرحله تعریف کنید");
        continue;
      }

      const stageName = normalizePersian(row.values.dealStage ?? "");
      const stageId = stageName
        ? (stageByKey.get(stageName) ?? firstStage.id)
        : firstStage.id;

      const amount = parseAmount(row.values.dealAmount);
      if (amount === null) {
        recordError("مبلغ باید عدد معتبر باشد");
        continue;
      }

      const closeDate = parseIsoDate(row.values.dealCloseDate);
      if ((row.values.dealCloseDate ?? "").trim() && !closeDate) {
        recordError("تاریخ باید با فرمت YYYY-MM-DD باشد");
        continue;
      }

      let contactId: string | null = null;
      const email = (row.values.email ?? "").trim().toLowerCase();
      if (email) {
        contactId = contactIdByEmail.get(email) ?? null;
        if (!contactId) {
          const name = (row.values.firstName ?? "").trim() || (row.values.lastName ?? "").trim();
          const created = await createContact(workspaceId, {
            firstName: name || email.split("@")[0],
            lastName: (row.values.lastName ?? "").trim() || null,
            email,
            phone: (row.values.phone ?? "").trim() || null,
            companyId: await getOrCreateCompany(row.values),
            source: SOURCE_MAP[normalizePersian(row.values.source ?? "")] ?? "other",
            lifecycleStage: LIFECYCLE_MAP[normalizePersian(row.values.lifecycle ?? "")] ?? "lead",
            ownerId: actorUserId ?? null,
          });
          contactId = created.id;
          contactIdByEmail.set(email, created.id);
          summary.created.contacts += 1;
        }
      }

      await createDeal(workspaceId, {
        title,
        amount,
        pipelineId: defaultPipeline.id,
        stageId,
        contactId,
        ownerId: actorUserId ?? null,
        closeDate,
        status: DEAL_STATUS_MAP[normalizePersian(row.values.dealStage ?? "")] ?? "open",
      });
      summary.created.deals += 1;
    } catch (e) {
      recordError(e instanceof Error ? e.message : "خطای ناشناخته در درج");
    }
  }

  return summary;
}
