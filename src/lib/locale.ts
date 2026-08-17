import { cookies } from "next/headers";

export type AppLocale = "fa" | "en";

const COOKIE_NAME = "locale";
const DEFAULT_LOCALE: AppLocale = "fa";

/** خواندن locale از کوکی — فقط در سرور کامپوننت قابل فراخوانی */
export async function getLocale(): Promise<AppLocale> {
  const jar = await cookies();
  const val = jar.get(COOKIE_NAME)?.value;
  if (val === "fa" || val === "en") return val;
  return DEFAULT_LOCALE;
}

/** آیا فارسی است؟ */
export async function isFa(): Promise<boolean> {
  return (await getLocale()) === "fa";
}
