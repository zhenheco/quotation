# 匯率 API 環境變數類型定義

## ADDED Requirements

### Requirement: Cloudflare Workers 環境必須包含 EXCHANGE_RATE_API_KEY

Cloudflare Workers 的環境類型定義 MUST 包含所有必要的環境變數，包括 `EXCHANGE_RATE_API_KEY`。

#### Scenario: 存取匯率 API 金鑰

**Given** `app/api/exchange-rates/sync/route.ts` 需要匯率 API 金鑰
**When** 存取 `env.EXCHANGE_RATE_API_KEY`
**Then** TypeScript 不應報告類型錯誤
**And** 環境類型必須定義此欄位為 `string | undefined`

### Requirement: 建立統一的環境類型定義檔

系統 MUST 建立 `types/cloudflare.d.ts` 定義所有 Cloudflare Workers 環境變數。

#### Scenario: 定義 Cloudflare Workers Env 介面

**Given** 專案使用 Cloudflare Workers
**When** 建立 `types/cloudflare.d.ts`
**Then** 定義 `CloudflareEnv` 介面:
```typescript
export interface CloudflareEnv {
  DB: D1Database
  KV: KVNamespace<string>
  EXCHANGE_RATE_API_KEY?: string
  SUPABASE_URL?: string
  SUPABASE_ANON_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}
```
**And** 擴充所有 API 路由的 `env` 參數類型

#### Scenario: API 路由使用環境類型

**Given** API 路由接收 `env` 參數
**When** 定義路由處理函式
**Then** 使用 `{ env }: { env: CloudflareEnv }` 類型
**Instead of** `{ env }: { env: { DB: D1Database; KV: KVNamespace } }`

**Before**:
```typescript
export async function POST(
  request: NextRequest,
  { env }: { env: { DB: D1Database; KV: KVNamespace } }
) {
  const apiKey = env.EXCHANGE_RATE_API_KEY  // 類型錯誤
}
```

**After**:
```typescript
import type { CloudflareEnv } from '@/types/cloudflare'

export async function POST(
  request: NextRequest,
  { env }: { env: CloudflareEnv }
) {
  const apiKey = env.EXCHANGE_RATE_API_KEY as string | undefined
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 500 })
  }
}
```

## MODIFIED Requirements

### Requirement: 統一所有 API 路由的環境類型

所有使用 Cloudflare Workers 環境的 API 路由 MUST 使用統一的 `CloudflareEnv` 類型。

#### Scenario: 逐一更新 API 路由

**Given** 以下檔案使用 `env` 參數:
- `app/api/products/route.ts`
- `app/api/products/[id]/route.ts`
- `app/api/customers/[id]/route.ts`
- `app/api/exchange-rates/sync/route.ts`

**When** 更新這些檔案
**Then** 導入 `CloudflareEnv` 類型
**And** 更新函式簽名使用此類型
**And** 確保類型一致性

## 實作注意事項

1. **類型定義位置**:
   - 建立 `types/cloudflare.d.ts`
   - 使用 `export interface` 而非 `declare interface`
   - 便於在其他檔案中導入

2. **環境變數完整性**:
   - 列出所有 Cloudflare Workers 需要的環境變數
   - 包含 Supabase 相關變數
   - 包含第三方 API 金鑰

3. **向後相容**:
   - 所有環境變數設為可選 (`?`)
   - API 內部檢查變數是否存在
   - 提供清晰的錯誤訊息

4. **型別安全**:
   - 使用 `env.EXCHANGE_RATE_API_KEY as string | undefined`
   - 不假設環境變數一定存在
   - 執行期檢查並回傳適當錯誤
