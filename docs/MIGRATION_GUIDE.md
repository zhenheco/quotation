# 資料庫遷移完整指南

## 總覽

將報價單系統從 Supabase/Zeabur PostgreSQL 遷移到 **Cloudflare D1 + KV** 架構。

**遷移時間估算**: 總共約 40 小時（分階段進行）

**架構變更**:
- 認證層：保留 Supabase Auth ✅
- 資料層：從 PostgreSQL → D1 (SQLite) 🔄
- 快取層：新增 Cloudflare KV 🆕

## 前置準備

### 1. 備份現有資料庫

```bash
# Supabase 資料庫備份
pg_dump -h <supabase-host> -U postgres -d postgres > backup-supabase-$(date +%Y%m%d).sql

# 保留 30 天作為回滾視窗
```

### 2. 確認環境變數

```bash
# 必要的環境變數
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export CLOUDFLARE_API_TOKEN="your-cloudflare-token"
```

### 3. 安裝必要工具

```bash
npm install -D tsx @supabase/supabase-js
```

## 階段 1: 建立 D1 資料庫（已完成 ✅）

```bash
# 1. 建立 D1 資料庫
npx wrangler d1 create quotation-system-db

# 2. 記錄 database_id 並更新 wrangler.jsonc

# 3. 執行初始 schema（本地測試）
npx wrangler d1 execute quotation-system-db --local --file=./migrations/d1/001_initial_schema.sql

# 4. 執行初始 schema（遠端）
npx wrangler d1 execute quotation-system-db --remote --file=./migrations/d1/001_initial_schema.sql

# 5. 驗證表結構
npx wrangler d1 execute quotation-system-db --local --command="SELECT name FROM sqlite_master WHERE type='table';"
```

## 階段 2: 資料導出（準備中）

```bash
# 從 Supabase 導出所有業務資料
npx tsx scripts/migration/export-from-supabase.ts

# 檢查導出的資料
ls -lh data-export/
# 應該看到 15 個 JSON 檔案：
# - roles.json
# - permissions.json
# - customers.json
# - products.json
# - quotations.json
# - ... 等等
```

## 階段 3: 資料導入（準備中）

```bash
# 本地測試導入
npx tsx scripts/migration/import-to-d1.ts --local

# 驗證資料完整性
npx wrangler d1 execute quotation-system-db --local --command="SELECT COUNT(*) FROM customers"

# 遠端導入
npx tsx scripts/migration/import-to-d1.ts --remote

# 再次驗證
npx wrangler d1 execute quotation-system-db --remote --command="SELECT COUNT(*) FROM customers"
```

## 階段 4: API 路由更新（主要工作）

### 遷移檢查清單

每個 API 路由需要：

1. **加上 Edge Runtime 聲明**
   ```typescript
   export const runtime = 'edge'
   ```

2. **更新函式簽名**
   ```typescript
   // 舊
   export async function GET(request: Request) { }

   // 新
   export async function GET(
     request: Request,
     { env }: { env: { DB: D1Database; KV: KVNamespace } }
   ) { }
   ```

3. **替換資料庫呼叫**
   ```typescript
   // 舊：直接 SQL
   import { query } from '@/lib/db/zeabur'
   const result = await query('SELECT * FROM customers WHERE user_id = $1', [userId])

   // 新：使用 DAL
   import { getD1Client } from '@/lib/db/d1-client'
   import { getCustomers } from '@/lib/dal/customers'
   const db = getD1Client(env)
   const customers = await getCustomers(db, userId)
   ```

4. **加入權限檢查（使用 KV 快取）**
   ```typescript
   import { getKVCache } from '@/lib/cache/kv-cache'
   import { checkPermission } from '@/lib/cache/services'

   const kv = getKVCache(env)
   const hasPermission = await checkPermission(kv, db, userId, 'customers:read')
   if (!hasPermission) {
     return Response.json({ error: 'Forbidden' }, { status: 403 })
   }
   ```

5. **失效快取（寫入操作）**
   ```typescript
   // 建立/更新/刪除後
   await kv.delete(`customers:list:${userId}`)
   ```

### API 路由遷移順序

**優先級 P0**（核心功能）:
1. ✅ `/api/auth/*` - 認證（保持不變，使用 Supabase Auth）
2. ⏳ `/api/customers` - GET, POST
3. ⏳ `/api/customers/[id]` - GET, PUT, DELETE
4. ⏳ `/api/products` - GET, POST
5. ⏳ `/api/products/[id]` - GET, PUT, DELETE
6. ⏳ `/api/quotations` - GET, POST
7. ⏳ `/api/quotations/[id]` - GET, PUT, DELETE

**優先級 P1**（重要功能）:
8. ⏳ `/api/quotations/[id]/pdf` - PDF 生成
9. ⏳ `/api/companies` - 公司管理
10. ⏳ `/api/exchange-rates` - 匯率
11. ⏳ `/api/exchange-rates/sync` - 匯率同步

**優先級 P2**（次要功能）:
12. ⏳ `/api/contracts` - 合約
13. ⏳ `/api/payments` - 付款
14. ⏳ `/api/admin/*` - 管理功能

## 階段 5: 測試

### 5.1 單元測試

```bash
# 測試 DAL 層
npm run test lib/dal

# 測試快取層
npm run test lib/cache
```

### 5.2 整合測試

```bash
# 本地環境測試（使用 D1 local）
npm run dev

# 測試所有 API 端點
curl http://localhost:3000/api/customers
curl http://localhost:3000/api/products
# ... 等等
```

### 5.3 效能測試

```bash
# 使用 Apache Bench 或 k6
ab -n 100 -c 10 http://localhost:3000/api/customers

# 預期結果：
# - p95 回應時間 < 100ms
# - KV 快取命中率 > 80%
```

## 階段 6: 部署

### 6.1 測試環境部署

```bash
# 建置專案
npm run build

# 部署到 Cloudflare
npm run deploy:cf

# 驗證部署
curl https://your-project.workers.dev/api/health
```

### 6.2 生產環境部署

```bash
# 1. 最後一次資料同步
npx tsx scripts/migration/export-from-supabase.ts
npx tsx scripts/migration/import-to-d1.ts --remote

# 2. 驗證資料完整性
npx wrangler d1 execute quotation-system-db --remote --command="SELECT COUNT(*) FROM customers"

# 3. 部署
npm run deploy:cf

# 4. 監控日誌
npx wrangler tail your-project-name

# 5. 冒煙測試
# 測試所有主要功能：登入、建立客戶、建立報價單、生成 PDF
```

### 6.3 切換流量

```bash
# 更新 DNS 或 Cloudflare Pages 設定
# 將流量切換到新的 Workers 部署
```

## 階段 7: 清理

### 7.1 保留 Supabase Auth

**不要刪除** Supabase Auth 資料，因為仍然使用。

### 7.2 清理 Zeabur

```bash
# 等待 30 天確認穩定後
# 刪除 Zeabur 資料庫
# 刪除 Zeabur 相關腳本（已完成）
```

### 7.3 更新文檔

```bash
# 更新 README.md
# 記錄新架構到 docs/ARCHITECTURE.md
# 歸檔舊文檔到 docs/archive/
```

## 回滾計畫

### 情境 1: 測試階段發現問題

1. 停止所有 D1 寫入操作
2. 切換回 Supabase/Zeabur
3. 恢復舊版程式碼
4. **時間**: 10 分鐘

### 情境 2: 生產環境問題

1. 立即切換環境變數回 Supabase
2. 重新部署舊版本
3. 從備份恢復（如有資料損失）
4. **時間**: < 5 分鐘

### 情境 3: 資料不一致

1. 停止所有寫入
2. 從 Supabase 備份恢復
3. 重新執行資料遷移
4. **時間**: 30 分鐘

## 監控指標

部署後需監控：

1. **效能指標**
   - API p95 回應時間 < 100ms ✅
   - KV 快取命中率 > 80% ✅
   - D1 查詢時間 < 50ms ✅

2. **錯誤率**
   - 錯誤率 < 0.1% ✅
   - 500 錯誤 = 0 ✅

3. **資料一致性**
   - 每日資料備份 ✅
   - 定期比對 D1 vs Supabase ✅

## 成本節省

遷移前：
- Supabase PostgreSQL: $25/月
- Zeabur PostgreSQL: $15/月
- **總計**: $40/月

遷移後：
- Cloudflare D1: $0/月（免費額度）
- Cloudflare KV: $0/月（免費額度）
- Cloudflare Workers: $0/月（免費額度）
- Supabase Auth: $0/月（免費額度）
- **總計**: $0/月

**節省**: $40/月 = $480/年 💰

## 常見問題

### Q: 為何保留 Supabase Auth？

A: Supabase Auth 功能完整、穩定、免費額度充足，且已整合完成。遷移認證系統風險高，收益低。

### Q: D1 有哪些限制？

A:
- SQLite 語法（無 JSONB 操作符）
- 寫入鎖定（使用樂觀鎖定緩解）
- 無 RLS（應用層權限檢查）

### Q: KV 最終一致性會有問題嗎？

A: 設定合理 TTL（1-24小時）+ 寫入後失效快取。非金融系統可接受 1 小時延遲。

### Q: 如何處理複雜查詢？

A: 簡化查詢邏輯，避免複雜 JOIN。如需複雜分析，可使用 Cloudflare Analytics Engine。

## 下一步

1. ✅ 完成 D1 和 KV 基礎架構
2. ⏳ 執行資料導出/導入
3. ⏳ 遷移 API 路由（35+ 個）
4. ⏳ 整合測試
5. ⏳ 部署到生產環境
6. ⏳ 監控 30 天
7. ⏳ 清理 Zeabur
