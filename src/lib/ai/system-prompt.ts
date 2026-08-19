import "server-only";

import { listPipelines } from "@/services/pipelines";
import { listCustomFields, listTags } from "@/services/contacts";
import { getWorkspaceMembers } from "@/services/workspace";
import {
  SOURCE_LABELS,
  STAGE_LABELS,
  STATUS_LABELS,
} from "@/lib/labels";

const BASE_PROMPT = `تو دستیار هوش مصنوعی CRM فارسی هستی. کاربرها را با زبان فارسی و لحن حرفه‌ای راهنمایی می‌کنی.

 قوانین:
 - اطلاعات را بر اساس ابزارهای موجود از پایگاه داده بخوان و گزارش کن؛ هرگز عدد را حدس نزن.
 - عملیات نوشتنی (ساخت مخاطب یا تسک، تخصیص محتوا) ابتدا به‌صورت درخواست تأیید ثبت می‌شوند؛ اگر نتیجه ابزار needsApproval=true بود، به کاربر اطلاع بده که عملیات در انتظار تأیید اوست و در پنل «در انتظار تأیید» قابل تأیید است.
 - برای ثبت برد/باخت فروش (updateDealStage یا ثبت نتیجه) درخواست تأیید بده؛ هرگز بدون تأیید وضعیت فروش را تغییر نده.
 - در پاسخ‌های عددی از اعداد فارسی استفاده کن.
 - اگر ابزار خطا داد یا داده‌ای نبود، صادقانه بگو.
 - برای تخصیص محتوا (ویدیو/مستند) به مخاطب از ابزار assignContent استفاده کن (نیاز به تأیید).
 - برای علامت‌گذاری محتوا به‌عنوان مشاهده‌شده از ابزار markContentViewed استفاده کن (نیاز به تأیید).
 - پایگاه دانش شامل توصیه‌های فروش، اطلاعات محصول و سوالات متداول است — از searchKnowledgeBase برای پاسخ به سوالات استفاده کن.`;

export async function buildSystemPrompt(workspaceId: string) {
  const parts: string[] = [BASE_PROMPT];

  const [pipelines, tags, customFields, members] = await Promise.allSettled([
    listPipelines(workspaceId),
    listTags(workspaceId),
    listCustomFields(workspaceId),
    getWorkspaceMembers(workspaceId),
  ]);

  if (pipelines.status === "fulfilled" && pipelines.value.length > 0) {
    parts.push(
      "فانل‌های فروش این ورک‌اسپیس:\n" +
        pipelines.value
          .map(
            (p) =>
              `- فانل «${p.name}» — مراحل: ${
                p.stages.length > 0
                  ? p.stages.map((s) => s.name).join("، ")
                  : "بدون مرحله"
              }`
          )
          .join("\n")
    );
  }

  if (tags.status === "fulfilled" && tags.value.length > 0) {
    parts.push(
      `برچسب‌های موجود مشتریان: ${tags.value.map((t) => t.name).join("، ")}`
    );
  }

  if (customFields.status === "fulfilled" && customFields.value.length > 0) {
    parts.push(
      `فیلدهای سفارشی مشتریان: ${customFields.value
        .map((f) =>
          f.options && f.options.length > 0
            ? `${f.name} (${f.key}): ${f.options.join("/")}`
            : `${f.name} (${f.key})`
        )
        .join("، ")}`
    );
  }

  if (members.status === "fulfilled" && members.value.items.length > 0) {
    parts.push(
      `اعضای تیم (برای تعیین مالک): ${members.value.items
        .map((m) => `${m.name ?? m.email}${m.role ? ` (${m.role})` : ""}`)
        .join("، ")}`
    );
  }

  parts.push(
    `برچسب‌های مرحله عمر مشتری: ${Object.values(STAGE_LABELS).join("، ")}`,
    `منابع مشتری: ${Object.values(SOURCE_LABELS).join("، ")}`,
    `وضعیت‌های فروش: ${Object.values(STATUS_LABELS).join("، ")}`
  );

  return parts.join("\n\n");
}
