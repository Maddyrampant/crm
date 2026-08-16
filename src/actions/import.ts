"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSession, getActiveWorkspace, hasPermission } from "@/lib/session";
import {
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  IMPORT_TEMPLATE,
  parseCsvToRows,
} from "@/lib/import-csv";
import { importCsvData } from "@/services/import";

const importSchema = z.object({
  csv: z.string().min(1, "فایل CSV خالی است"),
});

export async function importCsvAction(input: unknown) {
  const session = await getSession();
  if (!session?.user) return { ok: false, error: "ابتدا وارد شوید" };

  const membership = await getActiveWorkspace(session.user.id);
  if (!membership) return { ok: false, error: "فضای کاری یافت نشد" };
  if (!hasPermission(membership, "seller")) {
    return { ok: false, error: "شما اجازه ایمپورت داده ندارید" };
  }

  const parsed = importSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  }

  const csv = parsed.data.csv;
  if (Buffer.byteLength(csv, "utf8") > IMPORT_MAX_BYTES) {
    return { ok: false, error: "حجم فایل بیشتر از حد مجاز است (۲ مگابایت)" };
  }

  let parsedCsv;
  try {
    parsedCsv = parseCsvToRows(csv);
  } catch {
    return { ok: false, error: "فرمت CSV نامعتبر است" };
  }

  if (parsedCsv.rows.length === 0) {
    return { ok: false, error: "هیچ ردیف داده‌ای در فایل پیدا نشد" };
  }
  if (parsedCsv.rows.length > IMPORT_MAX_ROWS) {
    return {
      ok: false,
      error: `تعداد ردیف‌ها بیشتر از حد مجاز است (حداکثر ${IMPORT_MAX_ROWS} ردیف)`,
    };
  }

  try {
    const summary = await importCsvData(
      membership.workspaceId,
      parsedCsv,
      session.user.id
    );
    revalidatePath("/contacts");
    revalidatePath("/companies");
    revalidatePath("/pipeline");
    return { ok: true, data: summary };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "خطا در ایمپورت" };
  }
}

export async function getImportTemplateAction() {
  const session = await getSession();
  if (!session?.user) return { ok: false, error: "ابتدا وارد شوید" };
  return { ok: true, data: { filename: "import-template.csv", content: IMPORT_TEMPLATE } };
}
