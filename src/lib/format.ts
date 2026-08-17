import { format as formatJalali } from "date-fns-jalali";
import { format as formatGregorian } from "date-fns";
import { faIR } from "date-fns-jalali/locale";
import { enUS } from "date-fns/locale";

export type Locale = "fa" | "en";

const faNumber = new Intl.NumberFormat("fa-IR");
const enNumber = new Intl.NumberFormat("en-US");

function numFormatter(locale: Locale) {
  return locale === "fa" ? faNumber : enNumber;
}

function dateFnsLocale(locale: Locale) {
  return locale === "fa" ? faIR : enUS;
}

function formatFn(locale: Locale) {
  return locale === "fa" ? formatJalali : formatGregorian;
}

export function formatNumber(
  value: number | string | null | undefined,
  locale: Locale = "fa",
): string {
  if (value === null || value === undefined) return "—";
  return numFormatter(locale).format(Number(value));
}

export function formatCurrency(
  value: number | string | null | undefined,
  locale: Locale = "fa",
): string {
  if (value === null || value === undefined) return "—";
  const num = numFormatter(locale).format(Number(value));
  return locale === "fa" ? `${num} تومان` : `${num} IRR`;
}

export function formatDate(
  value: Date | string | null | undefined,
  locale: Locale = "fa",
): string {
  if (!value) return "—";
  const fmt = formatFn(locale);
  if (locale === "fa") {
    return fmt(new Date(value), "d MMMM yyyy", { locale: dateFnsLocale(locale) });
  }
  return fmt(new Date(value), "MMM d, yyyy", { locale: dateFnsLocale(locale) });
}

export function formatDateTime(
  value: Date | string | null | undefined,
  locale: Locale = "fa",
): string {
  if (!value) return "—";
  const fmt = formatFn(locale);
  if (locale === "fa") {
    return fmt(new Date(value), "d MMMM yyyy - HH:mm", {
      locale: dateFnsLocale(locale),
    });
  }
  return fmt(new Date(value), "MMM d, yyyy - HH:mm", {
    locale: dateFnsLocale(locale),
  });
}

export function toFaDigits(input: number | string): string {
  return faNumber.format(Number(input));
}
