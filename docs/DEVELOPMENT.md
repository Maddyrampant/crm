# راهنمای توسعه (DEVELOPMENT.md)

## راهاندازی اولیه

```bash
# ۱. نصب وابستگیها
pnpm install

# ۲. بالا آوردن دیتابیس
docker compose up -d db

# ۳. تنظیم متغیرهای محیطی
cp .env.example .env.local   # مقادیر را پر کنید

# ۴. مهاجرت و سید
pnpm db:migrate
pnpm db:seed

# ۵. اجرا
pnpm dev   # http://localhost:3000
```

## دستورات

| دستور | کاربرد |
|---|---|
| `pnpm dev` | سرور توسعه (Turbopack) |
| `pnpm build` | بیلد تولید |
| `pnpm lint` | لینت (eslint) |
| `pnpm db:generate` | تولید migration جدید از schema (drizzle-kit generate) |
| `pnpm db:migrate` | اعمال migration ها |
| `pnpm db:seed` | داده نمونه |
| `pnpm db:studio` | رابط بصری دیتابیس (Drizzle Studio) |

## متغیرهای محیطی (`.env.local`)

| متغیر | توضیح |
|---|---|
| `DATABASE_URL` | اتصال Postgres، مثال: `postgres://crm:crm@localhost:5432/crm` |
| `BETTER_AUTH_SECRET` | راز احراز هویت (Random) |
| `BETTER_AUTH_URL` | آدرس اپ: `http://localhost:3000` |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | ورود با گیتهاب (اختیاری) |
| `OPENROUTER_API_KEY` | کلید OpenRouter برای AI (بخش ۲) |
| `RESEND_API_KEY` | ایمیل تراکنشی (بخش ۲، اختیاری) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | SMTP (بخش ۲، اختیاری) |
| `KAVENEGAR_API_KEY` | پیامک فارسی (بخش ۲، اختیاری) |

## ساختار پوشهها

```
src/
├── app/                  ← مسیرها (App Router)
│   ├── (auth)/           ← ورود/ثبتنام — بخش ۱
│   ├── (dashboard)/      ← شل داشبورد + ماژولها
│   │   ├── contacts/     ← بخش ۱
│   │   ├── pipeline/     ← بخش ۱
│   │   ├── invoices/     ← بخش ۲
│   │   ├── calendar/     ← بخش ۲
│   │   ├── reports/      ← بخش ۲
│   │   └── settings/     ← بخش ۲
│   └── api/              ← Route Handlers (v1/webhooks/ai/send — بخش ۲)
├── components/           ← کامپوننتها (بر اساس ماژول)
│   └── ui/               ← shadcn/ui (مشترک)
├── config/nav.ts         ← منو ← آیتمهای خود را اینجا اضافه کنید
├── db/
│   ├── index.ts          ← کلاینت و استادور دیتابیس
│   └── schema/           ← اسکیماهای Drizzle (فایل جدا per ماژول)
│       ├── index.ts      ← ثبت همه
│       ├── auth.ts       ← Better Auth
│       ├── workspaces.ts
│       ├── contacts.ts   ← بخش ۱
│       ├── pipelines.ts  ← بخش ۱
│       ├── invoices.ts   ← بخش ۲
│       ├── calendar.ts   ← بخش ۲
│       ├── activity.ts
│       ├── automation.ts ← بخش ۲
│       └── ai.ts         ← بخش ۲
├── lib/
│   ├── db.ts             ← اتصال
│   ├── auth.ts           ← Better Auth + requireWorkspace + permission
│   ├── utils.ts          ← cn و...
│   └── format.ts         ← تاریخ/عدد فارسی
├── actions/              ← Server Actions (مستقیم از صفحات)
├── services/             ← لاجیک بیزینس
└── middleware.ts         ← (اختیاری) محدودسازی مسیر — فعلاً محافظت با requireWorkspace در هر صفحه است
```

## قراردادها

- **RTL**: `dir="rtl"` در روت لیاوت؛ فونت Vazirmatn.
- **اعداد/تاریخ فارسی**: از `src/lib/format.ts` (`formatNumber`, `formatCurrency`, `formatDate`) استفاده کنید — خودتان `toLocaleString` نزنید.
- **کوئریها**: سمت سرور (Server Components)؛ استیت کلاینت فقط با TanStack Query برای دادههای تعاملی.
- **اعتبارسنجی**: Zod در مرز هر ورودی (فرم و API).
- **لاگ فعالیت**: تمام جهشهای مهم → `activityLog` (append-only).
- **هیچ رازی در کلاینت**: کلیدهای مدل/دیتابیس فقط سمت سرور.

## جریان کار (گیتب)

1. از آخرین `main`: `git pull`
2. شاخه کاری: `git checkout -b part1/sales-modules` (بخش ۱) یا `part2/finance-ai` (بخش ۲)
3. کامیتهای کوچک Conventional
4. PR به `main` → CI خودکار (`lint` + `tsc` + `build`) روی PR اجرا میشود

### ترتیب ادغام (مهم برای فایلهای مشترک)

1. PR بخش ۲ (`part2/finance-ai` → شامل داشبورد، منو، فایلهای مشترک) **اول** به `main` مرج شود.
2. شاخه بخش ۱ پس از آن روی `main` بهروز **rebase** شود تا `nav.ts` و... بدون تعارض ادغام شوند.
3. هر تغییر فایل مشترک فقط در PR خودش، و با کامنت در PR تا طرف مقابل در جریان باشد.

## چکلیست قبل از PR

- [ ] فقط فایلهای در مالکیت خودم تغییر کردهاند (`docs/OWNERSHIP.md` را ببینید)
- [ ] `pnpm lint` و `npx tsc --noEmit` و `pnpm build` سبز
- [ ] همه اعداد/تاریخها با `src/lib/format.ts` فارسی فرمت شدهاند؛ رابط راستچین است
- [ ] جهشهای مهم دیتابیس در `activityLog` ثبت شدهاند
- [ ] هیچ رازی (کلید API/توکن) در کلاینت یا کامیت نیست
- [ ] تغییر فایل مشترک (اگر هست) در کامنت PR توضیح داده شده
- [ ] اسکرینشات صفحههای جدید در کامنت PR

## CI (GitHub Actions)

فایل `.github/workflows/ci.yml` روی هر PR به `main` اجرا میشود:

- `pnpm install --frozen-lockfile`
- `pnpm db:migrate` (با سرویس Postgres در CI)
- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm build`

هر PR باید این مراحل را پاس کند تا قابلمرج باشد.
