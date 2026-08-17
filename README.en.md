# CRM — Customer Relationship Management

A professional, Persian (Farsi) RTL CRM built with Next.js 16, PostgreSQL, and integrated AI.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript strict + Tailwind v4 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Auth | Better Auth (email/password + GitHub OAuth) |
| State | TanStack Query + Zustand |
| Tables | TanStack Table v8 |
| Kanban | dnd-kit |
| Charts | Recharts |
| AI | Vercel AI SDK v7 + OpenRouter |
| Email | SMTP / Resend |
| SMS | Kavenegar |
| Cache | Redis (optional, in-memory fallback) |
| PDF | pdf-lib + fontkit |

## Features

- **Multi-tenant** — workspace isolation with role-based access (owner > admin > manager > seller > viewer)
- **Contacts & Companies** — full CRUD with CSV import wizard
- **Sales Pipeline** — Kanban drag-and-drop with stage-based win probability
- **Deals** — weighted forecast, win/loss tracking, stalled deal detection
- **Invoices** — create, send, payment tracking with overdue detection
- **Calendar & Appointments** — scheduling with public booking links (`/s/{slug}`)
- **Tasks** — assignee, priority, due dates, reminders
- **Email & SMS** — transactional via SMTP/Resend + Kavenegar
- **Activity Feed** — append-only audit log with timeline view
- **Email Tracking** — open pixel (`/t/{token}`), PDF view tracking
- **Automation Rules** — event-driven conditions + actions (email, task, notification, SMS, deal move)
- **AI Assistant** — human-in-the-loop with tool confirmation
- **REST API** — public Bearer-authenticated endpoints
- **Webhooks** — inbound/outbound with delivery log + retry
- **Dashboard** — KPIs, revenue charts, pipeline stats, lead sources
- **Forecast** — weighted pipeline forecast, win prediction, stalled deals, best contact time
- **Persian UI** — full RTL support with Jalali dates and Farsi numerals

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Start database
docker compose up -d db redis

# 3. Configure environment
cp .env.example .env.local
# Generate auth secret: openssl rand -hex 32
# (Optional) Shared cache: REDIS_URL=redis://localhost:6379

# 4. Migrate & seed
pnpm db:generate && pnpm db:migrate && pnpm db:seed

# 5. Run
pnpm dev
```

**Default login:** `admin@crm.dev` / `admin1234`

## Project Structure

```
src/
├── app/
│   ├── (auth)/                  # Login & register
│   ├── (dashboard)/             # Main app shell
│   │   ├── contacts/            # Contacts & companies
│   │   ├── pipeline/            # Sales pipeline & deals
│   │   ├── invoices/            # Invoices & payments
│   │   ├── calendar/            # Appointments & tasks
│   │   ├── reports/             # Reports, tracking, forecast
│   │   ├── settings/            # Team, rules, booking links
│   │   ├── activity/            # Activity feed
│   │   └── notifications/       # Notification center
│   └── api/                     # REST API, webhooks, AI chat
├── actions/                     # Server actions (validated)
├── services/                    # Business logic + DB queries
├── lib/                         # Auth, cache, formatting, rules
├── components/
│   ├── ui/                      # shadcn/ui primitives
│   ├── layout/                  # Sidebar, header, search
│   ├── contacts/                # Contact components
│   ├── pipeline/                # Kanban, deal cards
│   ├── reports/                 # Charts, stat cards
│   ├── rules/                   # Automation rule builder
│   ├── bookings/                # Booking link manager
│   └── activity/                # Activity timeline
├── db/
│   └── schema/                  # Drizzle schema (per module)
└── config/
    └── nav.ts                   # Navigation menu
```

## Data Model

Every entity is isolated within a **workspace** (multi-tenant).

```
workspaces ─┬─ workspaceMembers (user + role)
            ├─ pipelines ── stages ── deals ── contacts ── companies
            ├─ invoices ── invoiceItems ── payments
            ├─ appointments / tasks
            ├─ bookingLinks
            ├─ automationRules ── ruleLogs
            ├─ trackingTokens
            ├─ webhooks ── webhookDeliveries
            ├─ apiKeys
            ├─ emailTemplates / emailLogs / smsLogs
            ├─ notifications
            └─ aiConversations ── aiMessages ── aiToolRuns
activityLog (append-only audit trail)
```

## Redis (Optional)

If `REDIS_URL` is not set, everything works with in-memory fallback.

| Component | Without Redis | With Redis |
|-----------|--------------|------------|
| Next.js Cache Handler (`'use cache'`) | In-memory | Shared between instances |
| Cache Service (`src/lib/cache.ts`) | In-memory | Redis + TTL |
| Rate Limiting | In-memory | Atomic token bucket (Lua) |
| Better Auth Sessions | Database | Database + Redis cache |

```bash
docker compose up -d redis    # Port 6379
# Or use Vercel Redis / Upstash with the same REDIS_URL
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Development server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Generate migration from schema |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed` | Seed sample data |
| `pnpm db:studio` | Drizzle Studio (visual DB browser) |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Auth secret (`openssl rand -hex 32`) |
| `BETTER_AUTH_URL` | Yes | App URL (e.g. `http://localhost:3000`) |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth |
| `REDIS_URL` | No | Redis for caching |
| `OPENROUTER_API_KEY` | No | AI assistant |
| `RESEND_API_KEY` | No | Transactional email |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | No | SMTP email |
| `KAVENEGAR_API_KEY` | No | Persian SMS |

## Architecture Principles

- **Server Components** for most pages — direct DB queries, no client waterfall
- **Server Actions** with Zod validation at the boundary
- **Optimistic Updates** via TanStack Query for interactive features
- **Human-in-the-loop AI** — tools execute only after user confirmation
- **Append-only audit log** — all significant changes tracked
- **Parallel development** — each contributor works in their own directories (see `docs/OWNERSHIP.md`)

## Performance Targets

- API p95 latency < 200ms
- Mobile 4G LCP < 2.5s
- All AI writes logged in audit trail with human confirmation

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Ownership & File Boundaries](docs/OWNERSHIP.md)
- [Development Guide](docs/DEVELOPMENT.md)

## Team

| Role | GitHub | Focus |
|------|--------|-------|
| Backend + Infrastructure | [@Maddyrampant](https://github.com/Maddyrampant) | Auth, invoices, calendar, AI, webhooks, API |
| Frontend + UI | [@hordekiller](https://github.com/hordekiller) | Contacts, pipeline, deals, reports, rules |

## License

Private — All rights reserved.
