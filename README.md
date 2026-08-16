# CRM — مدیریت ارتباط با مشتری

یک CRM فوقحرفهای، فارسی و راستچین (RTL) با Next.js 16، PostgreSQL و هوش مصنوعی داخلی.

## استک

- **Next.js 16** (App Router، TypeScript، Tailwind v4، Turbopack)
- **PostgreSQL 16 + Drizzle ORM**
- **Better Auth** (ایمیل/رمز + گیتهاب) با RBAC
- **Vercel AI SDK + OpenRouter** (دستیار هوشمند با تأیید انسانی)
- ایمیل (SMTP/Resend)، پیامک (Kavenegar)، وبهاوک و REST API عمومی

## ماژولها

| ماژول | وضعیت | مالک |
|---|---|---|
| اسکلت زیرساخت | در حال انجام | @Maddyrampant |
| احراز هویت + مشتریان + فانل فروش | برنامهریزی | @hordekiller |
| فاکتور + قرار ملاقات + داشبورد | برنامهریزی | @Maddyrampant |
| ایمیل/پیامک + REST API + وبهاوک + AI | برنامهریزی | @Maddyrampant |

جزئیات کامل: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/OWNERSHIP.md](docs/OWNERSHIP.md) · [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

## شروع سریع

```bash
pnpm install
docker compose up -d db redis
cp .env.example .env.local
# رمز BETTER_AUTH_SECRET را با openssl rand -hex 32 بسازید
# (اختیاری) برای کش اشتراکی: REDIS_URL=redis://localhost:6379
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm dev
```

ورود به سیستم با کاربر مدیر seed شده:
ایمیل `admin@crm.dev` و رمز `admin1234`
(نام کاربری و رمز را در `.env.local` قابل تغییر است)

## کش (Redis)

لایهٔ کش اختیاری است — اگر `REDIS_URL` تنظیم نشود همهچیز با fallback درون‌حافظه‌ای مثل قبل کار می‌کند.

| بخش | بدون Redis | با Redis |
|---|---|---|
| Cache Handler Next (`'use cache'`) | in-memory | مشترک بین اینستنس‌ها (`cache-handlers/`) |
| سرویس کش (`src/lib/cache.ts`) | in-memory | Redis + TTL |
| Rate limit | درون‌حافظه‌ای | Token bucket اتمیک (Lua) |
| جلسهٔ better-auth | در DB | در DB + کش Redis |

- داکر: `docker compose up -d redis` (پورت 6379)
- Vercel: Vercel Redis/Upstash با همان `REDIS_URL`
- استفادهٔ مستقیم در سرویس‌ها:
  ```ts
  import { cacheRemember, cacheKey } from "@/lib/cache";
  return cacheRemember(cacheKey("kpis", workspaceId), 60, async () => {
    // کوئری گران ...
  });
  ```

## نگهداری

| دستور | توضیح |
|---|---|
| `pnpm dev` | سرور توسعه |
| `pnpm build` / `pnpm lint` | بیلد و لینت |
| `pnpm db:generate` / `db:migrate` / `db:seed` / `db:studio` | ابزار دیتابیس |
