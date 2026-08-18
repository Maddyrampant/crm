<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CRM Project Rules

## Stack
- Next.js 16 (App Router, Turbopack)
- PostgreSQL + Drizzle ORM
- Better Auth (email/password)
- shadcn/ui + Tailwind CSS
- Persian/RTL (Farsi)
- pnpm (NOT npm)

## Commands
- `pnpm add <pkg>` — install packages
- `npx tsc --noEmit` — type check
- `npm run build` — production build (run `rm -rf .next` first)
- `npm start -- -p 3001` — start server on port 3001

## Important Ports
- Port 3000: belongs to another project (DO NOT USE)
- Port 3001: CRM server
- Port 5433: PostgreSQL (crm-db, user: crm, pass: crm)

## Auth
- Login: `admin@crm.dev` / `admin1234`
- Cookies stored at: `/tmp/opencode/cookies.txt`
- `BETTER_AUTH_URL="http://localhost:3000"` in `.env.local`

## Database
- Schema files: `src/db/schema/*.ts`
- Services: `src/services/*.ts` (server-only)
- Actions: `src/actions/*.ts` (use server)
- Migrations: `drizzle/*.sql`
- FK types: workspaces.id and user.id are `text`, NOT `uuid`

## Code Conventions
- All server actions use `"use server"` directive
- All detail pages use `export const dynamic = "force-dynamic"`
- Use `router.refresh()` instead of `window.location.reload()`
- Persian labels everywhere
- RTL on search inputs (`dir="rtl"`)
- `toast` from sonner for feedback
- `EmptyState` from `@/components/ui/empty-state` when empty
- `PaginationControls` for long lists
- No comments in code

## Work Division
- Part 1 (Maddyrampant/me): Backend services, actions, API routes, cron jobs
- Part 2 (hordekiller): UI components, pages, styling

## Project Board
- URL: https://github.com/users/Maddyrampant/projects/1
- Status field ID: PVTSSF_lAHOEbtFSs4BgbPyzhckLGs
- Options: برنامهریزی=f75ad846, در حال انجام=47fc9ee4, در بازبینی=dbba2e78, مسدود=74ec92c5, انجام شد=98236657

## Current Status (Aug 2026)
- 37+ pages, 115+ components, 30+ services, 25+ action files, 20 DB tables
- Major modules: Dashboard, Contacts, Companies, Pipeline/Deals, Products, Warehouses, Stock, Purchases, Suppliers, Invoices, Quotes, Email Campaigns, SMS, Goals, Reports, Lead Scoring, Custom Fields, Rules, Bookings, Notifications, Activity, Tracking, Audit Logs, WooCommerce, Profile, Workspace
- Security: Rate limiting, HMAC timing-safe, AES-256-GCM encryption
- Performance: 47 indexes on FK columns
