# مالکیت فایلها (OWNERSHIP)

قانون اصلی همکاری موازی: **هرکس فقط در دایرکتوریهای خودش مینویسد.** این جدول مرجع نهایی است.

## تقسیم کار

| فاز | مالک | آیسو | وضعیت |
|---|---|---|---|
| فاز ۰ — اسکلت زیرساخت | @Maddyrampant | [#1](https://github.com/Maddyrampant/crm/issues/1) | انجام شد |
| بخش ۱ — احراز هویت + مشتریان + فانل فروش | @hordekiller | [#2](https://github.com/Maddyrampant/crm/issues/2) | در حال انجام |
| بخش ۲ — فاکتور + قرارها + داشبورد + ایمیل/پیامک + API/وبهاوک + AI | @Maddyrampant | [#3](https://github.com/Maddyrampant/crm/issues/3) | در حال انجام ([PR #4](https://github.com/Maddyrampant/crm/pull/4)) |

## نقشه مالکیت دایرکتوری

### مشترک (فاز ۰ — تغییرات فقط با موافقت طرف مقابل)
```
src/lib/utils.ts              ← ابزار cn و...
src/lib/db.ts                 ← اتصال دیتابیس
src/db/schema/index.ts        ← ثبت همه schemaها (فایلهای schema را هرکس خودش دارد)
src/app/layout.tsx            ← روت لیاوت (RTL/فونت)
src/config/nav.ts             ← ← ← منو: هرکس فقط آیتم خودش را اضافه کند (ویرایش ترتیبی، نه همزمان)
docs/OWNERSHIP.md             ← همین فایل
.github/workflows/ci.yml      ← CI: lint + typecheck + build (روی هر PR)
```

### بخش ۱ — @hordekiller (آیسو #2)
```
src/app/(dashboard)/contacts/**
src/app/(dashboard)/pipeline/**
src/app/(dashboard)/page.tsx              ← داشبورد (UI)
src/app/(auth)/**
src/components/contacts/**
src/components/pipeline/**
src/components/dashboard/**               ← نمودارهای داشبورد (revenue-chart, stage-funnel)
src/components/layout/app-header.tsx
src/components/layout/app-sidebar.tsx
src/components/layout/global-search.tsx
src/components/layout/page-title.tsx
src/components/layout/notification-bell.tsx   ← پلاسهولدر؛ داده با بخش ۲ (وظایف/قرارها/تأییدها)
src/components/ui/stat-card.tsx
src/components/ui/page-header.tsx
src/components/ui/empty-state.tsx
src/actions/contacts.ts
src/actions/deals.ts
src/actions/search.ts
src/services/contacts.ts
src/services/companies.ts
src/services/deals.ts
src/services/pipelines.ts
src/db/schema/contacts.ts
src/db/schema/pipelines.ts
```

### بخش ۲ — @Maddyrampant (آیسو #3)
```
src/app/(dashboard)/invoices/**
src/app/(dashboard)/calendar/**
src/app/(dashboard)/reports/**
src/app/(dashboard)/settings/**
src/app/api/v1/**
src/app/api/webhooks/**
src/app/api/ai/**
src/app/api/send/**
src/components/ai/**
src/components/invoices/**
src/components/calendar/**
src/components/reports/**
src/components/integrations/**     ← کامپوزر ایمیل/پیامک (قابل استفاده در صفحه مشتری بخش ۱)
src/lib/ai/**
src/lib/integrations/**
src/services/invoices.ts
src/services/appointments.ts
src/services/tasks.ts
src/services/reports.ts            ← منبع داده گزارشها و نمودارها
src/services/automation.ts
src/services/ai.ts
src/db/schema/invoices.ts
src/db/schema/calendar.ts
src/db/schema/automation.ts
src/db/schema/ai.ts
```

## قوانین

1. فایل مشترک (`nav.ts`، `schema/index.ts`، روت لیاوت، `docs/OWNERSHIP.md`): تغییر با **PR جداگانه** و اطلاع به دیگری.
2. جدول جدید → فایل `schema/<module>.ts` → ثبت در `schema/index.ts` → `pnpm db:generate` + `pnpm db:migrate`.
3. لینت/بیلد قبل از هر PR: `pnpm lint` و `pnpm build` (و `npx tsc --noEmit`).
4. کامیتها Conventional: `feat(module): ...` / `fix(module): ...`.
5. شاخههای کاری: `part1/sales-modules` (بخش ۱) و `part2/finance-ai` (بخش ۲).
6. ترتیب ادغام: PR بخش ۲ اول به `main`؛ سپس شاخه بخش ۱ (PR #7) **rebase** روی `main` بهروز و هنگام حل تداخل داشبورد، **نسخه UI بخش ۱** میماند. تغییرات `nav.ts` هرکس فقط در PR خودش.
7. **طراحی بصری UI با @hordekiller است.** کامپوننتهای بخش ۲ (تنظیمات، گزارشها، کامپوزر و...) فقط از نظر منطق/کارکرد ساخته میشوند؛ هر پاس طراحی/استایل بعدی روی آنها با هماهنگی @hordekiller انجام میشود.
8. **دستیار هوشمند در سایدبار** (`app-sidebar.tsx`): بعد از مرج PR #4 لینک باید به `/assistant` + نشان `AI` باشد (بخش ۱ هنگام rebase PR #7 این را برگرداند).
