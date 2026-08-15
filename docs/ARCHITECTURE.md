# معماری (ARCHITECTURE.md)

## استک

| لایه | انتخاب |
|---|---|
| فریمورک | Next.js 16 (App Router) + TypeScript strict + Tailwind v4 |
| دیتابیس | PostgreSQL 16 + Drizzle ORM |
| احراز هویت | Better Auth (email/password + GitHub) |
| استیت کلاینت | TanStack Query + Zustand |
| جداول | TanStack Table v8 |
| کانبان | dnd-kit |
| نمودار | Recharts |
| AI | Vercel AI SDK v7 + OpenRouter |
| ایمیل | SMTP / Resend |
| پیامک | Kavenegar |

## الگوی داده

هر موجودیت CRM در یک **ورکاسپیس** (workspace) ایزوله میشود (multi-tenant). نقشها: `owner > admin > manager > seller > viewer`.

```
workspaces ─┬─ workspaceMembers (user + role + team)
            ├─ pipelines ── stages ── deals ── contactId ── contacts ── companyId ── companies
            ├─ invoices ── invoiceItems ── payments
            ├─ appointments / tasks
            ├─ webhooks ── webhookDeliveries
            ├─ apiKeys
            ├─ emailTemplates / emailLogs / smsLogs
            └─ aiConversations ── aiMessages ── aiToolRuns
activityLog (append-only) = رویدادهای همه ماژولها
```

## لایهها

1. **Route (صفحات/API)** — فقط ارسال/دریافت، بدون لاجیک
2. **Actions/Services** — لاجیک بیزینس + تراکنشهای دیتابیس
3. **Schema (Drizzle)** — مدل داده، یک فایل per ماژول
4. **lib/** — احراز، فرمت فارسی، دیتابیس

## الگوهای مهم

- **Server Components** برای اکثر صفحات؛ داده مستقیم از دیتابیس.
- **Server Actions** برای جهشها؛ اعتبارسنجی Zod در مرز.
- **Optimistic Updates** با TanStack Query برای تعاملات (درگ کانبان).
- **Human-in-the-loop**: ابزارهای نوشتنی AI فقط پس از تأیید کاربر اجرا میشوند (بخش ۲).
- **وبهاوک**: ورودی `api/webhooks`، خروجی از سرویس رویداد؛ log تحویل + retry + idempotency (بخش ۲).
- **audit log**: تمام تغییرات مهم، بهخصوص ابزارهای AI، ثبت میشود.

## مسیرهای کلیدی

| مسیر | هدف |
|---|---|
| `/` | داشبورد (پس از ورود) |
| `/login` | ورود |
| `/contacts` | مشتریان |
| `/pipeline` | کانبان فروش |
| `/invoices` | فاکتورها |
| `/calendar` | قرارها و تسکها |
| `/settings` | تنظیمات (کلید API، وبهاوک، AI، ایمیل) |
| `/api/v1/*` | REST عمومی (Bearer) |
| `/api/webhooks/*` | ورودی وبهاوک |
| `/api/ai/*` | استریم چت AI |

## اندازهگیری موفقیت

- p95 لاتنسی API محلی < 200ms
- LCP موبایل-4G < 2.5s
- تمام نوشتهای AI پس از تأیید انسانی + ثبت کامل در audit log
