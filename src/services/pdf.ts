import fs from "node:fs";
import path from "node:path";
import { PDFDocument, PDFFont, PDFPage, rgb, type Color } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import ArabicReshaper from "arabic-reshaper";
import bidiFactory from "bidi-js";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getInvoice } from "@/services/invoices";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import type { InvoiceStatus } from "@/db/schema";

const bidi = bidiFactory();

const FONT_PATH = path.join(process.cwd(), "src", "assets", "fonts", "Vazirmatn-Regular.ttf");
const FONT_BOLD_PATH = path.join(process.cwd(), "src", "assets", "fonts", "Vazirmatn-Bold.ttf");

const PAGE = { width: 595.28, height: 841.89, margin: 48 };

const INK = rgb(0.13, 0.14, 0.16);
const MUTED = rgb(0.45, 0.47, 0.52);
const LINE = rgb(0.85, 0.86, 0.9);
const HEAD_BG = rgb(0.94, 0.95, 0.97);

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "پیش‌نویس",
  sent: "ارسال‌شده",
  paid: "پرداخت‌شده",
  overdue: "سررسید گذشته",
  cancelled: "لغو شده",
};

/** شکل‌دهی + ترتیب بصری متن فارسی (Presentation Forms + الگوریتم Bidi). */
export function shapePersian(text: string, dir: "rtl" | "ltr" = "rtl"): string {
  const shaped = ArabicReshaper.convertArabic(text);
  const res = bidi.getEmbeddingLevels(shaped, dir);
  const flips = bidi.getReorderSegments(shaped, res);
  const chars = shaped.split("");
  for (const [start, end] of flips) {
    let i = start;
    let j = end;
    while (i < j) {
      const t = chars[i];
      chars[i] = chars[j];
      chars[j] = t;
      i++;
      j--;
    }
  }
  return chars.join("");
}

const fontCache = new Map<string, Uint8Array>();
function loadFontBytes(p: string): Uint8Array {
  let b = fontCache.get(p);
  if (!b) {
    b = fs.readFileSync(p);
    fontCache.set(p, b);
  }
  return b;
}

/** شکستن خط بر اساس پهنای واقعی (هر خط پس از wrap شکل‌دهی می‌شود). */
function wrapLines(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  dir: "rtl" | "ltr" = "rtl"
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const spaceW = font.widthOfTextAtSize(shapePersian(" ", dir), size);
  const lines: string[] = [];
  let current: string[] = [];
  let width = 0;
  for (const word of words) {
    const w = font.widthOfTextAtSize(shapePersian(word, dir), size);
    if (current.length > 0 && width + w + spaceW > maxWidth) {
      lines.push(shapePersian(current.join(" "), dir));
      current = [];
      width = 0;
    }
    current.push(word);
    width += current.length === 1 ? w : w + spaceW;
  }
  if (current.length > 0) lines.push(shapePersian(current.join(" "), dir));
  return lines;
}

function drawText(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  size: number,
  text: string,
  opts: {
    x: number;
    y: number;
    color?: Color;
    align?: "right" | "left" | "center";
    maxWidth?: number;
    lineGap?: number;
    dir?: "rtl" | "ltr";
    bold?: boolean;
  }
): number {
  const { color = INK, align = "right", lineGap = 4, dir = "rtl", bold = false } = opts;
  const f = bold ? boldFont : font;
  const maxW = opts.maxWidth ?? PAGE.width - PAGE.margin * 2;
  const lines = wrapLines(text, f, size, maxW, dir);
  let y = opts.y;
  for (const line of lines) {
    const w = f.widthOfTextAtSize(line, size);
    let x = opts.x;
    if (align === "right") x = opts.x - w;
    else if (align === "center") x = opts.x - w / 2;
    page.drawText(line, { x, y, size, font: f, color });
    y -= size + lineGap;
  }
  return y;
}

function lineHeight(font: PDFFont, size: number, gap: number): number {
  return size + gap;
}

export async function generateInvoicePdf(
  workspaceId: string,
  invoiceId: string
): Promise<Uint8Array> {
  const data = await getInvoice(workspaceId, invoiceId);
  if (!data) throw new Error("invoice not found");
  const { invoice, contact, items, payments } = data;

  const [wsRow] = await db
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  const workspaceName = wsRow?.name ?? "فضای کاری";

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(loadFontBytes(FONT_PATH), { subset: true });
  const boldFont = await doc.embedFont(loadFontBytes(FONT_BOLD_PATH), { subset: true });
  const page = doc.addPage([PAGE.width, PAGE.height]);
  const { width, height, margin } = PAGE;
  const right = width - margin;
  const contentW = width - margin * 2;
  const gap = 4;

  let y = height - margin;

  /* ── هدر ── */
  drawText(page, font, boldFont, 20, workspaceName, { x: right, y, color: INK, align: "right", bold: true });
  y -= lineHeight(font, 20, 2);
  drawText(page, font, boldFont, 12, "فاکتور فروش", { x: right, y, color: MUTED });
  y -= lineHeight(font, 12, gap) + 18;

  // خط جداکننده
  page.drawLine({ start: { x: margin, y }, end: { x: right, y }, thickness: 1, color: LINE });
  y -= 18;

  /* ── اطلاعات فاکتور (دو ستون) ── */
  const metaRight = [
    `شماره فاکتور: ${invoice.number}`,
    `وضعیت: ${STATUS_LABELS[invoice.status]}`,
  ];
  const metaLeft = [
    `تاریخ صدور: ${formatDate(invoice.issuedAt ?? invoice.createdAt)}`,
    invoice.dueAt ? `سررسید: ${formatDate(invoice.dueAt)}` : "سررسید: —",
  ];
  const metaW = contentW / 2 - 20;
  for (const line of metaRight) {
    drawText(page, font, boldFont, 11, line, { x: right, y, maxWidth: metaW });
    y -= lineHeight(font, 11, gap);
  }
  let yLeft = height - margin;
  yLeft -= lineHeight(font, 20, 2) + lineHeight(font, 12, gap) + 18 + 18;
  for (const line of metaLeft) {
    drawText(page, font, boldFont, 11, line, { x: margin + metaW, y: yLeft, maxWidth: metaW });
    yLeft -= lineHeight(font, 11, gap);
  }
  y -= 14;

  /* ── مشتری ── */
  page.drawRectangle({
    x: margin,
    y: y - 34,
    width: contentW,
    height: 34,
    color: HEAD_BG,
  });
  drawText(page, font, boldFont, 10, "مشتری", { x: right - 10, y: y - 8, color: MUTED });
  const customerName = `${contact.firstName}${contact.lastName ? " " + contact.lastName : ""}`;
  drawText(page, font, boldFont, 12, customerName, { x: right - 10, y: y - 24, bold: true });
  y -= 48;

  /* ── جدول اقلام ── */
  const colDesc = 240;
  const colQty = 50;
  const colPrice = 70;
  const colTax = 34;
  const colAmount = contentW - colDesc - colQty - colPrice - colTax; // 105
  const rowH = 24;

  const drawRowLine = (yy: number) =>
    page.drawLine({ start: { x: margin, y: yy }, end: { x: right, y: yy }, thickness: 0.5, color: LINE });

  const header = ["شرح", "تعداد", "قیمت واحد", "٪", "مبلغ"];
  let xRight = right;
  const headerCols = [colDesc, colQty, colPrice, colTax, colAmount];
  page.drawRectangle({ x: margin, y: y - rowH, width: contentW, height: rowH, color: HEAD_BG });
  for (let i = 0; i < header.length; i++) {
    const cellW = headerCols[i];
    drawText(page, font, boldFont, 10, header[i], {
      x: xRight - 6,
      y: y - rowH + 7,
      color: INK,
      maxWidth: cellW - 12,
      bold: true,
    });
    xRight -= cellW;
  }
  y -= rowH;
  drawRowLine(y);

  let subtotal = 0;
  let taxTotal = 0;
  for (const it of items) {
    const qty = Number(it.quantity);
    const price = Number(it.unitPrice);
    const taxRate = Number(it.taxRate);
    const lineAmount = qty * price;
    const lineTax = (lineAmount * taxRate) / 100;
    subtotal += lineAmount;
    taxTotal += lineTax;

    const descLines = wrapLines(it.description, font, 10, colDesc - 16);
    const descH = descLines.length * lineHeight(font, 10, 2);
    const nameLines = it.productName
      ? wrapLines(it.productName, font, 8, colDesc - 16)
      : [];
    const nameH = nameLines.length * lineHeight(font, 8, 1);
    const cellH = Math.max(descH + nameH, rowH) + 10;

    xRight = right;
    drawText(page, font, boldFont, 10, it.description, {
      x: xRight - 6,
      y: y - 10,
      maxWidth: colDesc - 16,
      align: "right",
    });
    if (it.productName) {
      const descY = y - 10 - descLines.length * lineHeight(font, 10, 2);
      for (let li = 0; li < nameLines.length; li++) {
        drawText(page, font, boldFont, 8, it.productName as string, {
          x: xRight - 6,
          y: descY - li * lineHeight(font, 8, 1),
          maxWidth: colDesc - 16,
          color: MUTED,
          align: "right",
        });
      }
    }
    xRight -= colDesc;

    const cellCenter = y - cellH / 2 + 4;
    const drawCell = (text: string, cellW: number, size: number, color?: Color) => {
      drawText(page, font, boldFont, size, text, {
        x: xRight - 6,
        y: cellCenter,
        maxWidth: cellW - 12,
        color,
        align: "right",
      });
      xRight -= cellW;
    };
    drawCell(formatNumber(qty), colQty, 10);
    drawCell(formatCurrency(price), colPrice, 10);
    drawCell(formatNumber(taxRate), colTax, 10);
    drawCell(formatCurrency(lineAmount), colAmount, 10, INK);

    y -= cellH;
    drawRowLine(y);
  }

  y -= 12;

  /* ── جمع‌ها ── */
  const totalsW = 240;
  const rows: [string, string, boolean?][] = [
    ["جمع اقلام", formatCurrency(subtotal)],
    ["مالیات", formatCurrency(taxTotal)],
    ["تخفیف", `-${formatCurrency(invoice.discount)}`],
    ["مبلغ نهایی", formatCurrency(invoice.total), true],
  ];
  for (const [label, value, isBold] of rows) {
    const yy = y;
    drawText(page, font, boldFont, isBold ? 12 : 10, label, {
      x: right,
      y: yy,
      maxWidth: totalsW - 120,
      bold: isBold,
    });
    drawText(page, font, boldFont, isBold ? 12 : 10, value, {
      x: right - (totalsW - 120),
      y: yy,
      maxWidth: 116,
      color: isBold ? INK : MUTED,
      bold: isBold,
    });
    y -= lineHeight(font, isBold ? 12 : 10, gap);
  }
  y -= 10;

  /* ── یادداشت ── */
  if (invoice.notes) {
    drawText(page, font, boldFont, 9, "یادداشت", { x: right, y: y, color: MUTED });
    y -= lineHeight(font, 9, gap);
    const noteLines = wrapLines(invoice.notes, font, 10, contentW - 40);
    y = noteLines.reduce((acc) => acc - lineHeight(font, 10, gap), y);
  }

  /* ── پرداخت‌ها ── */
  if (payments.length > 0) {
    const paid = payments.reduce((acc, p) => acc + Number(p.amount), 0);
    y -= 14;
    drawText(page, font, boldFont, 9, `پرداخت‌شده: ${formatCurrency(paid)}`, { x: right, y, color: MUTED });
  }

  /* ── پاورقی ── */
  page.drawLine({ start: { x: margin, y: 46 }, end: { x: right, y: 46 }, thickness: 0.5, color: LINE });
  drawText(page, font, boldFont, 8, `ساخته‌شده با CRM — ${formatDate(new Date())}`, {
    x: right,
    y: 32,
    color: MUTED,
  });

  return doc.save();
}
