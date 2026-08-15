# مالکیت فایلها (OWNERSHIP)

قانون اصلی همکاری موازی: **هرکس فقط در دایرکتوریهای خودش مینویسد.** این جدول مرجع نهایی است.

## تقسیم کار

| فاز | مالک | آیسو | وضعیت |
|---|---|---|---|
| فاز ۰ — اسکلت زیرساخت | @Maddyrampant | [#1](https://github.com/Maddyrampant/crm/issues/1) | در حال انجام |
| بخش ۱ — احراز هویت + مشتریان + فانل فروش | @hordekiller | [#2](https://github.com/Maddyrampant/crm/issues/2) | برنامهریزی |
| بخش ۲ — فاکتور + قرارها + داشبورد + ایمیل/پیامک + API/وبهاوک + AI | @Maddyrampant | [#3](https://github.com/Maddyrampant/crm/issues/3) | برنامهریزی |

## نقشه مالکیت دایرکتوری

### مشترک (فاز ۰ — تغییرات فقط با موافقت طرف مقابل)
```
src/lib/utils.ts              ← ابزار cn و...
src/lib/db.ts                 ← اتصال دیتابیس
src/db/schema/index.ts        ← ثبت همه schemaها (فایلهای schema را هرکس خودش دارد)
src/app/layout.tsx            ← روت لیاوت (RTL/فونت)
src/config/nav.ts             ← ← ← منو: هرکس فقط آیتم خودش را اضافه کند (ویرایش ترتیبی، نه همزمان)
docs/OWNERSHIP.md             ← همین فایل
```

### بخش ۱ — @hordekiller (آیسو #2)
```
src/app/(dashboard)/contacts/**
src/app/(dashboard)/pipeline/**
src/app/(auth)/**
src/components/contacts/**
src/components/pipeline/**
src/actions/contacts.ts
src/actions/deals.ts
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
src/lib/ai/**
src/lib/integrations/**
src/services/invoices.ts
src/services/appointments.ts
src/services/tasks.ts
src/services/reports.ts
src/services/automation.ts
src/services/ai.ts
src/db/schema/invoices.ts
src/db/schema/calendar.ts
src/db/schema/automation.ts
src/db/schema/ai.ts
```

## قوانین

1. فایل مشترک (`nav.ts`، `schema/index.ts`، روت لیاوت): تغییر با **PR جداگانه** و اطلاع به دیگری.
2. جدول جدید → فایل `schema/<module>.ts` → ثبت در `schema/index.ts` → `pnpm db:generate` + `pnpm db:migrate`.
3. لینت/بیلد قبل از هر PR: `pnpm lint` و `pnpm build`.
4. کامیتها Conventional: `feat(module): ...` / `fix(module): ...`.
5. شاخههای کاری: `part1/sales-modules` (بخش ۱) و `part2/finance-ai` (بخش ۲).
