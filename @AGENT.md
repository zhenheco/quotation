# @AGENT.md

This file provides instructions for AI agents working with this codebase.

---

## 🎯 Current Mission

**會計系統功能擴充** - 實作發票多元輸入、傳票自動分錄、報表分析、營業稅申報功能。

### Task Management

- **任務清單**: 參見 `@fix_plan.md`
- **詳細規格**: 參見 `specs/SPEC.md`
- **完成條件**: 參見 `@fix_plan.md` 底部的「✅ 總體完成條件」

### Execution Flow

```
1. 讀取 @fix_plan.md 確認當前優先任務
2. 讀取 specs/SPEC.md 了解詳細需求
3. 實作功能（遵循下方的專案規範）
4. 執行 pnpm run lint && pnpm run typecheck
5. 更新 @fix_plan.md 標記完成項目 [x]
6. 重複直到所有任務完成
```

---

## Project Overview

**quotation-app** - A quotation management system built with Next.js 15 (App Router) deployed on Cloudflare Workers via OpenNext.js.

- **Framework**: Next.js 15 + TypeScript
- **Package Manager**: pnpm (v9.15.0)
- **Database**: Supabase (PostgreSQL)
- **Test Framework**: Vitest + Playwright
- **Deployment**: Cloudflare Workers

---

## Build Commands

```bash
# Install dependencies
pnpm install

# Development server (DO NOT auto-start - user manages this)
pnpm dev

# Production build (Next.js + OpenNext.js for Cloudflare)
pnpm run build

# Type checking
pnpm run typecheck

# Linting
pnpm run lint
pnpm run lint:fix    # Auto-fix
```

---

## Test Commands

```bash
# Run all tests
pnpm test:run

# Watch mode (for development)
pnpm test:watch

# Run specific test suites
pnpm run test:unit           # Unit tests only (tests/unit/)
pnpm run test:integration    # Integration tests (tests/integration/)

# E2E tests
pnpm run test:e2e:playwright # Playwright E2E tests

# Coverage report
pnpm run test:coverage
```

### Test Locations
- `tests/unit/` - Unit tests
- `tests/integration/` - Integration tests
- `tests/e2e/` - End-to-end tests
- `__tests__/` - Additional test files (observability, security)

---

## Database Commands

```bash
# Verify schema synchronization
pnpm db:verify

# Run migrations
pnpm migrate

# Seed test data
pnpm seed
pnpm seed:admin      # Admin test data
pnpm seed:payments   # Payment test data
```

---

## Deployment Commands

```bash
# Preview on Cloudflare (local)
pnpm run preview:cf

# Deploy to Cloudflare Workers
pnpm run deploy:cf
```

---

## Pre-commit Hooks

This project uses Husky + lint-staged. Before committing:

1. ESLint runs on staged `.ts`/`.tsx` files
2. TypeScript type checking (`tsc --noEmit`)
3. Lockfile sync verification

If commit fails:
```bash
pnpm run lint:fix    # Fix ESLint issues
pnpm run typecheck   # Check type errors
pnpm install         # Sync lockfile
```

---

## Key Directories

```
app/
├── [locale]/    # i18n routes (zh, en)
├── admin/       # Admin console
├── api/         # API routes
└── auth/        # OAuth callbacks

lib/
├── dal/         # Data Access Layer
├── services/    # Business logic
├── security/    # Security utilities
└── utils/       # Helper functions

tests/
├── unit/        # Unit tests
├── integration/ # Integration tests
└── e2e/         # E2E tests
```

---

## Important Notes

1. **Always use `pnpm`** - Never use npm or yarn
2. **Commit lockfile changes** - Always commit `pnpm-lock.yaml` after package changes
3. **Run tests before push** - Use `pnpm test:run` to verify
4. **Environment variables** - Always `.trim()` when reading from `process.env`
