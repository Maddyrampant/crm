import { format as formatJalali } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";

const faNumber = new Intl.NumberFormat("fa-IR");

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return faNumber.format(Number(value));
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${faNumber.format(Number(value))} تومان`;
}

export function formatDate(
  value: Date | string | null | undefined
): string {
  if (!value) return "—";
  return formatJalali(new Date(value), "d MMMM yyyy", { locale: faIR });
}

export function formatDateTime(
  value: Date | string | null | undefined
): string {
  if (!value) return "—";
  return formatJalali(new Date(value), "d MMMM yyyy - HH:mm", {
    locale: faIR,
  });
}

export function toFaDigits(input: number | string): string {
  return faNumber.format(Number(input));
}
