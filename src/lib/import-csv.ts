import { parse } from "csv-parse/sync";

export type ImportEntity = "company" | "contact" | "deal";

export type ImportColumnKey =
  | "type"
  | "companyName"
  | "companyWebsite"
  | "companyIndustry"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "source"
  | "lifecycle"
  | "tags"
  | "dealTitle"
  | "dealAmount"
  | "dealStage"
  | "dealCloseDate"
  | "notes";

export type ImportRowError = {
  row: number;
  entity: ImportEntity;
  message: string;
};

export type ImportSummary = {
  totalRows: number;
  created: {
    companies: number;
    contacts: number;
    deals: number;
  };
  errors: ImportRowError[];
};

export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 5000;

export const IMPORT_COLUMN_DEFS: {
  key: ImportColumnKey;
  labels: string[];
}[] = [
  { key: "type", labels: ["نوع", "type"] },
  { key: "companyName", labels: ["نام شرکت", "شرکت", "company"] },
  { key: "companyWebsite", labels: ["وب سایت", "وب‌سایت", "website"] },
  { key: "companyIndustry", labels: ["صنعت", "industry"] },
  { key: "firstName", labels: ["نام", "first name", "firstname"] },
  { key: "lastName", labels: ["نام خانوادگی", "last name", "lastname"] },
  { key: "email", labels: ["ایمیل", "email"] },
  { key: "phone", labels: ["تلفن", "موبایل", "phone", "mobile"] },
  { key: "source", labels: ["منبع", "source"] },
  { key: "lifecycle", labels: ["مرحله", "lifecycle stage", "stage"] },
  { key: "tags", labels: ["برچسب ها", "برچسب‌ها", "برچسب", "tags", "tag"] },
  { key: "dealTitle", labels: ["عنوان فرصت", "فرصت", "deal title"] },
  { key: "dealAmount", labels: ["مبلغ", "amount"] },
  { key: "dealStage", labels: ["مرحله فانل", "فانل", "pipeline stage"] },
  { key: "dealCloseDate", labels: ["تاریخ بستن", "close date"] },
  { key: "notes", labels: ["یادداشت", "توضیحات", "notes"] },
];

export type ParsedRow = {
  rowNumber: number;
  values: Partial<Record<ImportColumnKey, string>>;
};

export type ParsedHeaders = {
  key: ImportColumnKey;
  index: number;
}[];

export type ParsedCsv = {
  rows: ParsedRow[];
  headers: ParsedHeaders;
};

export function normalizeHeader(input: string): string {
  return input
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .trim()
    .toLowerCase()
    .replace(/[_\-\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePersian(input: string): string {
  return input
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[_\-\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function toEnglishDigits(input: string): string {
  const FA = "۰۱۲۳۴۵۶۷۸۹";
  const AR = "٠١٢٣٤٥٦٧٨٩";
  return input.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)));
}

export function detectDelimiter(firstLine: string): string {
  const counts = [",", ";", "\t"].map((d) => ({
    d,
    n: firstLine.split(d).length - 1,
  }));
  const best = counts.reduce((a, b) => (b.n > a.n ? b : a), { d: ",", n: 0 });
  return best.n > 0 ? best.d : ",";
}

export function parseCsvToRows(csv: string): ParsedCsv {
  const firstLine = csv.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine.replace(/^\uFEFF/, ""));

  const raw = parse(csv, {
    bom: true,
    delimiter,
    skipEmptyLines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
    columns: false,
  }) as string[][];

  if (raw.length === 0) return { rows: [], headers: [] };

  const headerCells = raw[0].map((h) => normalizeHeader(h));
  const columnIndex = new Map<string, number>();
  headerCells.forEach((h, i) => {
    if (h && !columnIndex.has(h)) columnIndex.set(h, i);
  });

  const headers: ParsedHeaders = [];
  for (const def of IMPORT_COLUMN_DEFS) {
    let index: number | null = null;
    for (const label of def.labels) {
      const idx = columnIndex.get(normalizeHeader(label));
      if (idx !== undefined) {
        index = idx;
        break;
      }
    }
    if (index !== null) headers.push({ key: def.key, index });
  }

  const rows: ParsedRow[] = [];
  for (let i = 1; i < raw.length; i++) {
    const cells = raw[i];
    const values: ParsedRow["values"] = {};
    for (const h of headers) {
      values[h.key] = (cells[h.index] ?? "").trim();
    }
    if (Object.values(values).every((v) => !v)) continue;
    rows.push({ rowNumber: i + 1, values });
  }

  return { rows, headers };
}

export const IMPORT_TEMPLATE = `نوع,نام شرکت,وب سایت,صنعت,نام,نام خانوادگی,ایمیل,تلفن,منبع,مرحله,برچسب ها,عنوان فرصت,مبلغ,مرحله فانل,تاریخ بستن,یادداشت
شرکت,توسعه نرم افزار آریا,aria-dev.com,نرم افزار,,,,,,,,,,,,مشتری کلیدی
مشتری,,,,علی,محمدی,ali@example.com,09121234567,referral,customer,مهم;ویژه,,,,توضیح نمونه
مشتری,,,,مریم,احمدی,maryam@example.com,09351112233,advertisement,lead,جدید,,,,,
فرصت,,,,,,,,,,,,قرارداد پشتیبانی سالانه,150000000,بسته شده,2026-09-01,قیمت توافقی
فرصت,,,,علی,محمدی,,,,,,,,فروش اشتراک دوم,45000000,مذاکره,2026-10-15,`;
