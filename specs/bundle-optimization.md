# Bundle 優化與代碼清理規格

## 任務描述

優化 Cloudflare Workers bundle 大小，目前為 17.7 MiB，超出 10 MiB 限制。通過清理未使用的代碼、優化依賴、重構架構來減少 bundle 大小。

---

## 背景資訊

### 當前狀態

| 項目 | 數值 |
|------|------|
| Wrangler 上傳大小 | 17.7 MiB |
| Workers Paid 限制 | 10 MiB |
| 差距 | 超出 7.7 MiB |
| API Routes 總數 | 104 個 |
| 未使用 Routes | 11-15 個 |

### 已完成的優化

- 移除 nodemailer（改用 Brevo REST API）
- 移除 react-email 套件
- 移除 exceljs（Excel 解析移至客戶端）
- 移除 @react-pdf/renderer（未使用）
- Source maps 未生成

---

## 功能需求

### 1. API Routes 清理（高優先）

#### 1.1 刪除測試端點（3 個）

| 路徑 | 說明 |
|------|------|
| `app/api/test-admin/route.ts` | 管理員測試端點 |
| `app/api/test-email/route.ts` | 郵件測試端點 |
| `app/api/seed-test-data/route.ts` | 測試資料種子端點 |

#### 1.2 刪除舊管理工具（4 個）

| 路徑 | 說明 |
|------|------|
| `app/api/admin/apply-migration-011/route.ts` | 舊遷移工具 |
| `app/api/admin/d1-diagnostic/route.ts` | D1 診斷工具 |
| `app/api/admin/diagnose-storage/route.ts` | 存儲診斷工具 |
| `app/api/admin/init-permissions/route.ts` | 權限初始化工具 |

#### 1.3 刪除重複/未使用端點（4 個）

| 路徑 | 說明 | 備註 |
|------|------|------|
| `app/api/user-info/route.ts` | 用戶資訊 | 與 `/api/auth/me` 重複 |
| `app/api/me/route.ts` | 當前用戶 | 與 `/api/auth/me` 重複 |
| `app/api/storage/company-files/route.ts` | 檔案列表 | 無前端引用 |
| `app/api/auth/logout/route.ts` | 登出端點 | 確認 Supabase Auth 已處理 |

#### 1.4 合併重複端點

確認以下兩組端點哪個正在使用，刪除未使用的一組：

```
/api/company/[id]/members/*     ← 可能是舊版
/api/companies/[id]/members/*   ← 可能是新版
```

---

### 2. Middleware 重構（中優先）

#### 2.1 問題描述

`lib/api/middleware.ts` 使用 `getCloudflareContext` 獲取 KV Cache，影響 129 個檔案。

#### 2.2 重構目標

簡化 middleware，移除 KV 依賴，直接使用 Supabase 查詢。

#### 2.3 修改內容

**檔案**: `lib/api/middleware.ts`

修改前：
```typescript
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getKVCache } from '@/lib/cache/kv-cache'

const { env } = await getCloudflareContext()
const kv = getKVCache(env)
```

修改後：
```typescript
// 移除 getCloudflareContext 和 KV 依賴
// 直接使用 Supabase 進行認證和權限檢查
```

#### 2.4 更新 ApiContext 介面

```typescript
// Before
export interface ApiContext {
  user: { id: string; email?: string }
  db: SupabaseClient
  kv: KVCache      // 移除
  env: CloudflareEnv  // 移除
}

// After
export interface ApiContext {
  user: { id: string; email?: string }
  db: SupabaseClient
}
```

---

### 3. 快取服務重構（中優先）

#### 3.1 檔案清理

評估並處理以下快取相關檔案：

| 檔案 | 動作 |
|------|------|
| `lib/cache/kv-cache.ts` | 刪除或重構 |
| `lib/cache/services.ts` | 修改 `checkPermission` 函數 |

#### 3.2 權限檢查重構

修改 `checkPermission` 函數，移除 KV 依賴，改用直接資料庫查詢。

---

### 4. 依賴優化（低優先）

#### 4.1 評估可移除的依賴

檢查以下依賴是否仍需要：

| 套件 | 用途 | 評估 |
|------|------|------|
| `recharts` | 圖表 | 保留（報表需要） |
| `xlsx` | Excel 解析 | 保留（客戶端使用） |
| `pdf-lib` | PDF 生成 | 保留（客戶端使用） |

#### 4.2 tree-shaking 優化

確認 `next.config.ts` 的 `optimizePackageImports` 設定：

```typescript
experimental: {
  optimizePackageImports: [
    'lucide-react',
    'recharts',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-tabs',
  ],
}
```

---

### 5. legacy_backup 清理（低優先）

#### 5.1 評估 legacy_backup 目錄

`legacy_backup/` 目錄包含舊代碼，評估是否可以完全刪除。

**注意**：確認沒有任何檔案引用 `legacy_backup/` 中的代碼。

---

## 注意事項

### 刪除前必須確認

1. **搜尋引用**：使用 grep 確認沒有其他檔案引用要刪除的 API route
2. **前端調用**：確認沒有前端代碼調用這些端點
3. **測試覆蓋**：如果有相關測試，一併刪除

### 不可刪除的項目

- 任何有前端 UI 調用的 API route
- 任何被 cron job 調用的端點
- 核心業務邏輯相關的服務

### 重構時保持功能

- `withAuth` 和 `withAuthOnly` 函數的功能必須保持不變
- 認證和授權邏輯必須正常運作
- 權限檢查必須正確執行

---

## 測試要求

### 刪除 API Routes 後

```bash
pnpm run build          # 確認構建成功
pnpm run lint           # 確認無 lint 錯誤
pnpm run typecheck      # 確認無類型錯誤
```

### Middleware 重構後

- 測試登入功能正常
- 測試權限檢查正常（有權限/無權限情境）
- 測試各主要 API 端點正常響應

---

## 完成條件

當滿足以下條件時，此任務視為 **Completed**：

- [ ] 11 個未使用的 API routes 已刪除
- [ ] 重複的 company/companies members 端點已合併
- [ ] `lib/api/middleware.ts` 已移除 `getCloudflareContext` 依賴
- [ ] `lib/cache/kv-cache.ts` 已刪除或重構
- [ ] `pnpm run build` 成功
- [ ] `pnpm run lint` 無錯誤
- [ ] `pnpm run typecheck` 無錯誤
- [ ] 登入功能正常運作
- [ ] 權限檢查功能正常運作
- [ ] Bundle 大小已記錄（用於評估是否需要遷移 Vercel）

---

## 預期成果

### Bundle 大小變化

| 優化項目 | 預估節省 |
|---------|---------|
| 刪除 11-15 個 API routes | 150-500 KB |
| 移除 KV cache 相關代碼 | 50-100 KB |
| 清理 legacy_backup（如適用） | 未知 |
| **總計** | **約 200-600 KB** |

### 後續決策

完成優化後，根據最終 bundle 大小決定：

- **< 10 MiB**：繼續使用 Cloudflare Workers
- **> 10 MiB**：執行 Vercel 遷移計劃（參考 `glittery-splashing-harbor.md`）
