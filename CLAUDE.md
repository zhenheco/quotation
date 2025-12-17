# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Quick Reference Commands

```bash
# Development
pnpm dev                      # Start dev server (DO NOT auto-start - user manages this)
pnpm run build                # Build for production (Next.js + OpenNext.js)
pnpm run lint                 # Run ESLint
pnpm run lint:fix             # Auto-fix ESLint issues
pnpm run typecheck            # TypeScript type checking

# Testing
pnpm test                     # Run all tests (Vitest)
pnpm test:run                 # Run tests once
pnpm test:watch               # Watch mode
pnpm run test:unit            # Unit tests only
pnpm run test:integration     # Integration tests only
pnpm run test:e2e:playwright  # Playwright E2E tests

# Database
pnpm db:verify                # Verify schema sync
pnpm migrate                  # Run migrations
pnpm seed                     # Seed test data

# Cloudflare
pnpm run preview:cf           # Preview on Cloudflare
pnpm run deploy:cf            # Deploy to Cloudflare
```

---

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 (App Router) + TypeScript
- **Deployment**: Cloudflare Workers (via OpenNext.js)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Google OAuth, Email/Password)
- **Styling**: Tailwind CSS 4
- **State**: TanStack Query
- **i18n**: next-intl (EN/ZH)

### Key Architectural Patterns

#### 1. Data Access Layer (DAL) Pattern
All database operations go through `lib/dal/*.ts`:
```typescript
import { getSupabaseClient } from '@/lib/db/supabase-client'
// DAL functions handle queries and return typed results
```

#### 2. API Route Structure
- `app/api/**/route.ts` - Next.js API routes
- All API routes use DAL functions, never direct DB queries
- Standard response format: `{ success: boolean, data?: T, error?: string }`

#### 3. Server vs Client Components
- Pages in `app/[locale]/**/page.tsx` are server components by default
- Client components use `'use client'` directive
- Forms and interactive components in separate `*Form.tsx` or `*Client.tsx` files

#### 4. Multi-tenant Architecture
- Company-based data isolation via `company_id` in all tables
- User context from `lib/utils/company-context.ts`
- RBAC via `lib/services/rbac.ts` and `lib/dal/rbac.ts`

### Directory Structure (Key Paths)
```
app/
├── [locale]/           # i18n routes (dashboard, products, customers, etc.)
├── admin/              # Admin console (no i18n)
├── api/                # API routes
└── auth/               # OAuth callbacks

lib/
├── dal/                # Data Access Layer (DB queries)
├── services/           # Business logic
├── api/                # API client utilities
├── security/           # CSRF, headers, validation
└── observability/      # Logging, tracing

types/                  # TypeScript types
messages/               # i18n translations (en.json, zh.json)
migrations/             # SQL migration files
```

---

## Development Policies

### Do NOT Auto-Start Dev Server
The development server is managed manually by the user.

### Pre-commit Hooks (Husky + lint-staged)
Commits automatically trigger:
1. ESLint check + auto-fix on staged `.ts`/`.tsx` files
2. TypeScript type checking (`tsc --noEmit`)
3. Lockfile sync verification

If commit fails, fix with:
```bash
pnpm run lint:fix    # Fix ESLint
pnpm run typecheck   # See type errors
pnpm install         # Sync lockfile
```

---

## Cloudflare Workers Deployment Checklist

**90% of deployment failures are lockfile sync issues!**

### Before Every Push to main:
```bash
# 1. If any packages were installed/updated:
pnpm install
git add pnpm-lock.yaml

# 2. Verify build passes:
pnpm run build

# 3. Commit with lockfile:
git status  # Ensure pnpm-lock.yaml is staged
```

### Never:
- Use `npm install` (breaks lockfile sync)
- Modify `package.json` without running `pnpm install`
- Push without committing `pnpm-lock.yaml`

### On Deployment Failure:
```bash
gh run view <run-id> --log
# If ERR_PNPM_OUTDATED_LOCKFILE: run pnpm install and commit lockfile
```

---

## TypeScript Conventions

### Forbidden:
- `any` type (unless with `eslint-disable-next-line` + explanation)
- `@ts-ignore` (use `@ts-expect-error` with explanation instead)

### Required Patterns:

```typescript
// API Response typing
const data = await response.json() as { token: string };

// Error handling
try {
  // ...
} catch (error) {
  console.error((error as Error).message);
}

// Cloudflare Workers compatibility
interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}
```

### When @ts-expect-error is Allowed:
```typescript
// ✅ With explanation for infrastructure incompatibility
// @ts-expect-error - Cloudflare Workers RequestInit type compatibility
const config: RequestInit = { ... };
```

---

## Database

### Access Pattern
```typescript
import { getSupabaseClient } from '@/lib/db/supabase-client'
const db = getSupabaseClient()  // Uses Service Role (bypasses RLS)
const { data } = await db.from('products').select('*')
```

### Key Tables
- Auth: `user_profiles`, `user_roles`, `roles`, `permissions`
- Business: `products`, `customers`, `quotations`, `quotation_items`
- Finance: `payments`, `payment_schedules`, `customer_contracts`
- Company: `companies`, `company_settings`

### After Running Migrations
```sql
-- Record the migration
INSERT INTO schema_migrations (filename) VALUES ('0XX_migration.sql');
-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
```

---

## OpenSpec Change Management

<!-- OPENSPEC:START -->
When the request mentions **planning, proposals, architecture changes, or new capabilities**, always read `@/openspec/AGENTS.md` first for:
- How to create and apply change proposals
- Spec format and conventions
- Project structure guidelines
<!-- OPENSPEC:END -->

---

## OAuth Redirect Troubleshooting

Common issue: After Google login, redirect goes to wrong URL.

### Root Causes (check in order):
1. **GitHub Secrets** point to wrong Supabase project
2. **`NEXT_PUBLIC_*` variables** not set at build time in CI
3. **Supabase Dashboard**: Site URL not set to `https://quote24.cc`

### Quick Diagnosis:
```bash
# Check production JS bundle for correct Supabase URL
curl -s "https://quote24.cc/zh/login" | grep -o '[a-z]*\.supabase\.co'
```

### Fix Checklist:
1. GitHub Secrets: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. GitHub Actions workflow: Build step has all `NEXT_PUBLIC_*` env vars
3. Supabase Dashboard: Site URL = `https://quote24.cc`, Redirect URLs include `https://quote24.cc/**`
