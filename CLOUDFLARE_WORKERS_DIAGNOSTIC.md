# Cloudflare Workers 部署診斷報告

## 執行日期
2025-11-02

## 問題總結
Next.js 應用部署在 Cloudflare Workers (使用 OpenNext) 時，API endpoints 返回 500 錯誤。

## 診斷結果

### 1. 發現的主要問題

#### 問題 A: API 路由缺失導入
**文件**: `/app/api/quotations/[id]/route.ts`
**原因**: PUT 和 DELETE 路由使用了未導入的 `createClient()` 函數
**影響**: 導致運行時 ReferenceError，API 調用返回 500 錯誤

**解決方案**:
- 將 PUT/DELETE 路由改為使用 `createApiClient(request)`（來自 `@/lib/supabase/api`）
- `createApiClient` 是設計用於 API 路由的正確函數，可以直接從請求對象初始化
- `createClient()` 是設計用於 Server Components 的，不適合 API 路由環境

#### 問題 B: customer_email 欄位可用性 ✓
**文件**: `/lib/services/database.ts` (第 307 行)
**狀態**: 正常 - 欄位被正確查詢
```typescript
SELECT q.*, c.name as customer_name, c.email as customer_email
FROM quotations q
LEFT JOIN customers c ON q.customer_id = c.id
```

### 2. 修復清單

✅ **已完成的修復:**

1. **導入更正** - 已移除不存在的 `createClient` 導入
2. **PUT 路由修復** - 改為使用 `createApiClient(request)`
3. **DELETE 路由修復** - 改為使用 `createApiClient(request)`
4. **構建驗證** - `pnpm run build` 成功完成，無編譯錯誤

### 3. 環境配置驗證

#### Wrangler 配置 (wrangler.jsonc)
```json
{
  "name": "quotation-system",
  "main": ".open-next/worker.js",
  "compatibility_date": "2025-03-25",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```
✅ 配置正確，包含 `nodejs_compat` 標誌

#### Next.js 配置 (next.config.ts)
```typescript
output: 'standalone',
outputFileTracingRoot: path.join(__dirname),
```
✅ 正確配置 - OpenNext 需要的關鍵設定存在

#### 環境變數
已設置的變數:
- ✅ SUPABASE_POOLER_URL
- ✅ SUPABASE_DB_URL
- ✅ NEXT_PUBLIC_SUPABASE_URL
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
- ✅ SUPABASE_SERVICE_ROLE_KEY

### 4. 構建構件驗證

```
✅ .open-next/worker.js - OpenNext Worker 入口點
✅ .open-next/assets - 靜態資源目錄
✅ .next/standalone - Next.js 獨立構建輸出
```

OpenNext 構建結構正常，包括:
- Worker 初始化層 (`cloudflare/init.js`)
- 圖片處理 (`cloudflare/images.js`)
- 中間件處理 (`middleware/handler.mjs`)
- 服務器函數 (`server-functions/default/handler.mjs`)

## 部署建議

### 立即部署步驟

1. **本地驗證**
   ```bash
   pnpm run build
   pnpm run preview:cf
   ```

2. **部署到 Cloudflare**
   ```bash
   pnpm run deploy:cf
   ```

3. **驗證部署**
   ```bash
   # 查看即時日誌
   wrangler tail quotation-system --format pretty

   # 測試 API
   curl https://quotation-system.your-subdomain.workers.dev/api/quotations/[id]
   ```

### 監控和調試

#### 啟用 Workers 日誌
在 Cloudflare Dashboard:
1. 前往 Workers & Pages > quotation-system
2. 點擊 "Logs" 標籤
3. 監控實時輸出

#### 常見 500 錯誤原因檢查清單

| 症狀 | 檢查項目 |
|------|--------|
| 資料庫連接失敗 | 驗證 `SUPABASE_POOLER_URL` 環境變數已設定 |
| 認證失敗 | 檢查 Supabase 金鑰是否正確 |
| 404 on /zh/quotations/[id] | 檢查 i18n 路由配置在 middleware 中 |
| 靜態資源 404 | 檢查 wrangler.jsonc 的 assets 配置 |
| 超時 | 檢查資料庫連接池設定 |

## API 端點驗證

### GET /api/quotations/[id]
```
✅ 正確的身份驗證（使用 createApiClient）
✅ 資料庫查詢包括 customer_email
✅ 完整的錯誤處理
```

### POST /api/quotations/[id]/send
```
✅ 正確的身份驗證（使用 createApiClient）
✅ 客戶郵件驗證
✅ 報價單狀態更新
✅ 詳細的日誌記錄
```

### PUT /api/quotations/[id]
```
✅ 已修復 - 現在使用 createApiClient(request)
✅ 項目處理（刪除/重新插入）
✅ 欄位白名單驗證
```

### DELETE /api/quotations/[id]
```
✅ 已修復 - 現在使用 createApiClient(request)
✅ 級聯刪除（項目先刪）
✅ 擁有權驗證
```

## 性能優化建議

### 快取策略
在 `open-next.config.ts` 啟用:
```typescript
export default defineCloudflareConfig({
  // 啟用適當的快取策略
  // 例如: 靜態資產 1 小時，API 響應 5 分鐘
});
```

### 資料庫連接
- Neon 無伺服器驅動程式已配置用於 Cloudflare Workers
- 連接池設置在 `lib/db/zeabur.ts` 中

### 資源監控
```bash
# 查看 Worker 執行統計
wrangler analytics engine tail
```

## 測試計劃

### 單位測試
```bash
pnpm run test:unit
```

### 集成測試
```bash
pnpm run test:integration
```

### E2E 測試（在部署後）
```bash
pnpm run test:e2e
```

## 總結

**主要問題**: API 路由使用了不合適的 Supabase 客戶端初始化方法
**修復狀態**: ✅ 已完成
**構建狀態**: ✅ 通過
**部署就緒**: ✅ 是

現在可以安全地部署到 Cloudflare Workers，API endpoints 應該正常運作。

---

## 檢查清單 (部署前)

- [x] 修復 API 路由的 Supabase 客戶端初始化
- [x] 驗證 `next build` 成功
- [x] 驗證 OpenNext 構建構件存在
- [x] 驗證環境變數已設定
- [x] 驗證資料庫查詢包括必需欄位
- [ ] 運行 `pnpm run preview:cf` 測試本地
- [ ] 部署到 Cloudflare
- [ ] 驗證 API 端點可存取
- [ ] 檢查 Worker 日誌確認無錯誤
