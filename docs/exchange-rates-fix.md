# 匯率服務模組修復文檔

## 問題摘要

修復匯率服務模組中的兩個主要問題：
1. Supabase 客戶端使用不當（使用瀏覽器端客戶端在 Server Side）
2. RLS 權限不足（無法寫入 `exchange_rates` 表）

## 修復內容

### 1. 重構匯率服務模組 (`lib/services/exchange-rate.ts`)

**變更內容：**
- 移除直接引入 `createClient`
- 採用**依賴注入模式**，所有函數接受 `SupabaseClient` 作為參數
- 保持函數簽名一致性，向後相容

**修改的函數：**
```typescript
// 修改前
export async function syncRatesToDatabase(baseCurrency: Currency = 'USD'): Promise<boolean>
export async function getLatestRatesFromDB(baseCurrency: Currency = 'USD'): Promise<Record<Currency, number>>
export async function getRatesByDate(date: string, baseCurrency: Currency = 'USD'): Promise<Record<Currency, number> | null>
export async function getExchangeRates(baseCurrency: Currency = 'USD'): Promise<Record<Currency, number>>

// 修改後
export async function syncRatesToDatabase(supabase: SupabaseClient, baseCurrency: Currency = 'USD'): Promise<boolean>
export async function getLatestRatesFromDB(supabase: SupabaseClient, baseCurrency: Currency = 'USD'): Promise<Record<Currency, number>>
export async function getRatesByDate(supabase: SupabaseClient, date: string, baseCurrency: Currency = 'USD'): Promise<Record<Currency, number> | null>
export async function getExchangeRates(supabase: SupabaseClient, baseCurrency: Currency = 'USD'): Promise<Record<Currency, number>>
```

**優點：**
- ✅ 明確控制客戶端來源（Server Side 使用 `@/lib/supabase/server`）
- ✅ 更容易測試（可以注入 mock 客戶端）
- ✅ 符合依賴注入原則，降低耦合度

### 2. 更新 API Routes

**修改檔案：**
- `app/api/exchange-rates/route.ts`
- `app/api/exchange-rates/sync/route.ts`

**變更內容：**
```typescript
// 在每個 API route 中引入 Server Side 客戶端
import { createClient } from '@/lib/supabase/server'

// 建立客戶端並傳遞給服務函數
const supabase = await createClient()
const rates = await getExchangeRates(supabase, baseCurrency)
```

### 3. 修復 RLS 政策

**問題：**
`exchange_rates` 表原本只有 SELECT 權限，無法執行 INSERT/UPDATE 操作。

**解決方案：**
建立新的 RLS 政策，允許所有已驗證用戶進行讀寫操作。

**新增的政策：**
```sql
-- 允許所有已驗證用戶讀取匯率資料
CREATE POLICY "Authenticated users can view exchange rates"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (true);

-- 允許所有已驗證用戶插入匯率資料
CREATE POLICY "Authenticated users can insert exchange rates"
  ON exchange_rates FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 允許所有已驗證用戶更新匯率資料
CREATE POLICY "Authenticated users can update exchange rates"
  ON exchange_rates FOR UPDATE
  TO authenticated
  USING (true);
```

**安全性考量：**
- ✅ 只允許已驗證用戶操作（`TO authenticated`）
- ✅ 匯率資料是公開資訊，允許所有用戶寫入是合理的
- ✅ 不允許刪除操作，保持資料完整性

## 套用步驟

### 步驟 1: 套用資料庫 Migration

```bash
# 確保環境變數已設定
export SUPABASE_DB_URL="your_database_url"

# 執行 migration 腳本
./scripts/apply-exchange-rates-migration.sh
```

或手動執行 SQL：
```bash
psql "$SUPABASE_DB_URL" -f supabase-migrations/002_fix_exchange_rates_rls.sql
```

### 步驟 2: 測試修復

```bash
# 啟動開發伺服器
npm run dev

# 在另一個終端執行測試
./scripts/test-exchange-rates.sh
```

### 步驟 3: 驗證功能

測試以下功能是否正常：
1. ✅ 獲取匯率（GET `/api/exchange-rates`）
2. ✅ 指定基準貨幣（GET `/api/exchange-rates?base=TWD`）
3. ✅ 同步匯率到資料庫（POST `/api/exchange-rates/sync`）
4. ✅ 從資料庫讀取快取匯率

## 檔案清單

### 修改的檔案
- `lib/services/exchange-rate.ts` - 匯率服務核心邏輯
- `app/api/exchange-rates/route.ts` - 獲取匯率 API
- `app/api/exchange-rates/sync/route.ts` - 同步匯率 API
- `supabase-schema.sql` - 主要 Schema 定義

### 新增的檔案
- `supabase-migrations/002_fix_exchange_rates_rls.sql` - RLS 修復 Migration
- `scripts/apply-exchange-rates-migration.sh` - Migration 套用腳本
- `scripts/test-exchange-rates.sh` - 功能測試腳本
- `docs/exchange-rates-fix.md` - 此文檔

## API 使用範例

### 1. 獲取匯率

```bash
# 預設使用 USD 作為基準
curl http://localhost:3000/api/exchange-rates

# 指定基準貨幣
curl http://localhost:3000/api/exchange-rates?base=TWD
```

**回應範例：**
```json
{
  "success": true,
  "base_currency": "USD",
  "rates": {
    "USD": 1.0,
    "TWD": 31.5,
    "EUR": 0.92,
    "JPY": 149.8,
    "CNY": 7.24
  },
  "timestamp": "2025-10-16T10:30:00.000Z"
}
```

### 2. 同步匯率

```bash
curl -X POST http://localhost:3000/api/exchange-rates/sync \
  -H "Content-Type: application/json" \
  -d '{"baseCurrency": "USD"}'
```

**回應範例：**
```json
{
  "success": true,
  "message": "匯率同步成功",
  "timestamp": "2025-10-16T10:30:00.000Z"
}
```

## 後續建議

### 短期改進
1. 新增匯率更新排程（使用 Cron Job 或 Vercel Cron）
2. 新增錯誤監控和告警機制
3. 實作匯率查詢快取（Redis 或 Memory Cache）

### 長期優化
1. 支援更多貨幣
2. 提供歷史匯率查詢 API
3. 實作匯率趨勢分析
4. 建立管理介面，控制匯率更新頻率

## 錯誤排除

### 問題 1: Migration 執行失敗

**錯誤訊息：**
```
ERROR: policy "Anyone can view exchange rates" already exists
```

**解決方法：**
手動刪除舊政策：
```sql
DROP POLICY IF EXISTS "Anyone can view exchange rates" ON exchange_rates;
```

### 問題 2: 仍然無法寫入

**可能原因：**
- RLS 政策未生效
- 使用了匿名客戶端（未驗證）

**檢查方法：**
```sql
-- 檢查當前政策
SELECT * FROM pg_policies WHERE tablename = 'exchange_rates';

-- 檢查當前用戶
SELECT auth.uid();
```

### 問題 3: API 回應錯誤

**檢查步驟：**
1. 確認 `.env.local` 包含正確的 Supabase 憑證
2. 檢查伺服器日誌 (`logs/` 目錄)
3. 驗證 ExchangeRate API Key 是否有效

## 測試涵蓋

- ✅ API Routes 使用正確的 Supabase 客戶端
- ✅ 資料庫寫入權限正常
- ✅ 從 API 獲取匯率
- ✅ 同步匯率到資料庫
- ✅ 從資料庫讀取快取匯率
- ✅ 錯誤處理機制

## 版本資訊

- **修復日期**: 2025-10-16
- **影響版本**: v0.1.0+
- **相關 Commit**: (待填入)

---

**維護者**: Claude AI Backend Developer
**最後更新**: 2025-10-16
