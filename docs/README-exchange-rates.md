# 匯率服務模組文檔

## 快速導航

- [修復文檔](./exchange-rates-fix.md) - 問題診斷和修復過程
- [實作報告](./implementation-report-exchange-rates-fix.md) - 完整的實作細節和規格
- [主要 Schema](../supabase-schema.sql) - 資料庫結構定義
- [Migration 檔案](../supabase-migrations/002_fix_exchange_rates_rls.sql) - RLS 政策修復

## 架構概覽

```
┌─────────────────────────────────────────────────────────┐
│                     Client (Browser)                     │
└───────────────────────┬─────────────────────────────────┘
                        │
                        │ HTTP Request
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                  │
│  • GET  /api/exchange-rates                             │
│  • POST /api/exchange-rates/sync                        │
└───────────────────────┬─────────────────────────────────┘
                        │
                        │ Function Call
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Service Layer (Business Logic)              │
│  • getExchangeRates(supabase, baseCurrency)             │
│  • syncRatesToDatabase(supabase, baseCurrency)          │
│  • getLatestRatesFromDB(supabase, baseCurrency)         │
└───────────────────────┬─────────────────────────────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
┌─────────────────────┐   ┌──────────────────────┐
│  ExchangeRate-API   │   │  Supabase Client     │
│  (External Service) │   │  (@supabase/ssr)     │
└─────────────────────┘   └──────────┬───────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │  PostgreSQL Database │
                          │  (exchange_rates)    │
                          └──────────────────────┘
```

## 核心功能

### 1. 獲取匯率
從資料庫或外部 API 獲取最新匯率資料。

**API Endpoint:**
```bash
GET /api/exchange-rates?base=USD
```

**Service Function:**
```typescript
import { createClient } from '@/lib/supabase/server'
import { getExchangeRates } from '@/lib/services/exchange-rate'

const supabase = await createClient()
const rates = await getExchangeRates(supabase, 'USD')
```

### 2. 同步匯率
手動觸發從 ExchangeRate-API 獲取最新資料並同步到資料庫。

**API Endpoint:**
```bash
POST /api/exchange-rates/sync
Content-Type: application/json

{
  "baseCurrency": "USD"
}
```

**Service Function:**
```typescript
import { syncRatesToDatabase } from '@/lib/services/exchange-rate'

const success = await syncRatesToDatabase(supabase, 'USD')
```

### 3. 歷史匯率查詢
查詢指定日期的歷史匯率資料。

**Service Function:**
```typescript
import { getRatesByDate } from '@/lib/services/exchange-rate'

const rates = await getRatesByDate(supabase, '2025-10-15', 'USD')
```

### 4. 貨幣轉換
執行貨幣之間的匯率轉換計算。

**Service Function:**
```typescript
import { convertCurrency } from '@/lib/services/exchange-rate'

// 將 100 USD 轉換為 TWD
const twd = convertCurrency(100, 'USD', 'TWD', rates)
```

### 5. 格式化顯示
根據地區和貨幣格式化金額顯示。

**Service Function:**
```typescript
import { formatCurrency } from '@/lib/services/exchange-rate'

const formatted = formatCurrency(1234.56, 'TWD')
// 輸出: "NT$1,234.56"
```

## 支援的貨幣

```typescript
export const SUPPORTED_CURRENCIES = [
  'TWD',  // 新台幣
  'USD',  // 美元
  'EUR',  // 歐元
  'JPY',  // 日圓
  'CNY'   // 人民幣
] as const
```

## 資料庫結構

### exchange_rates 表

```sql
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(10, 6) NOT NULL,
  date DATE NOT NULL,
  source VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_currency, to_currency, date)
);
```

### 索引
```sql
CREATE INDEX idx_exchange_rates_currencies_date
  ON exchange_rates(from_currency, to_currency, date);
```

### RLS 政策
- ✅ 已驗證用戶可以讀取（SELECT）
- ✅ 已驗證用戶可以寫入（INSERT）
- ✅ 已驗證用戶可以更新（UPDATE）
- ❌ 不允許刪除（DELETE）

## 快速開始指南

### 1. 環境設定

建立 `.env.local` 檔案：
```bash
# Supabase 連線
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# ExchangeRate-API
EXCHANGE_RATE_API_KEY=your_api_key

# 資料庫 Migration 用
SUPABASE_DB_URL=postgresql://user:pass@host:5432/db
```

### 2. 套用 Migration

```bash
# 給予執行權限
chmod +x scripts/apply-exchange-rates-migration.sh

# 執行 migration
./scripts/apply-exchange-rates-migration.sh
```

### 3. 初始化資料

```bash
# 啟動開發伺服器
npm run dev

# 執行初始同步
curl -X POST http://localhost:3000/api/exchange-rates/sync
```

### 4. 測試功能

```bash
# 執行完整測試
./scripts/test-exchange-rates.sh
```

## 常用腳本

### 開發腳本

```bash
# 啟動開發伺服器
npm run dev

# 建置生產版本
npm run build

# TypeScript 型別檢查
npm run type-check
```

### 資料庫腳本

```bash
# 套用 RLS 修復 Migration
./scripts/apply-exchange-rates-migration.sh

# 匯入測試資料（包含匯率）
./scripts/import-test-data.sh
```

### 測試腳本

```bash
# 測試匯率功能
./scripts/test-exchange-rates.sh

# 測試特定環境
./scripts/test-exchange-rates.sh https://your-domain.com
```

## API 使用範例

### 範例 1: 獲取預設匯率（USD 基準）

```bash
curl http://localhost:3000/api/exchange-rates
```

**回應：**
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

### 範例 2: 獲取 TWD 基準匯率

```bash
curl http://localhost:3000/api/exchange-rates?base=TWD
```

**回應：**
```json
{
  "success": true,
  "base_currency": "TWD",
  "rates": {
    "TWD": 1.0,
    "USD": 0.0317,
    "EUR": 0.0292,
    "JPY": 4.753,
    "CNY": 0.2298
  },
  "timestamp": "2025-10-16T10:30:00.000Z"
}
```

### 範例 3: 同步匯率資料

```bash
curl -X POST http://localhost:3000/api/exchange-rates/sync \
  -H "Content-Type: application/json" \
  -d '{"baseCurrency": "USD"}'
```

**回應：**
```json
{
  "success": true,
  "message": "匯率同步成功",
  "timestamp": "2025-10-16T10:30:00.000Z"
}
```

### 範例 4: 在 Server Component 中使用

```typescript
import { createClient } from '@/lib/supabase/server'
import { getExchangeRates } from '@/lib/services/exchange-rate'

export default async function QuotationPage() {
  const supabase = await createClient()
  const rates = await getExchangeRates(supabase, 'USD')

  return (
    <div>
      <h1>目前匯率</h1>
      <ul>
        {Object.entries(rates).map(([currency, rate]) => (
          <li key={currency}>
            {currency}: {rate}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

## 錯誤處理

### 常見錯誤與解決方案

#### 1. 權限被拒絕錯誤
```
permission denied for table exchange_rates
```

**解決方案：**
```bash
# 套用 RLS 修復 migration
./scripts/apply-exchange-rates-migration.sh
```

#### 2. API Key 未設定
```
❌ EXCHANGE_RATE_API_KEY 未設定
```

**解決方案：**
在 `.env.local` 中設定：
```bash
EXCHANGE_RATE_API_KEY=your_api_key_here
```

#### 3. 資料庫連線失敗
```
Error: Failed to connect to database
```

**解決方案：**
檢查 Supabase 憑證是否正確：
```bash
# 驗證連線
curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

#### 4. 匯率資料過期
```
⚠️  資料庫無匯率資料，從 API 獲取...
```

**解決方案：**
執行手動同步：
```bash
curl -X POST http://localhost:3000/api/exchange-rates/sync
```

## 效能優化建議

### 1. 實作快取層
```typescript
// 使用 Redis 或 Memory Cache
import { cache } from 'react'

export const getCachedRates = cache(async (baseCurrency: Currency) => {
  const supabase = await createClient()
  return getExchangeRates(supabase, baseCurrency)
})
```

### 2. 排程更新
```typescript
// 使用 Vercel Cron 或自訂排程
// vercel.json
{
  "crons": [{
    "path": "/api/exchange-rates/sync",
    "schedule": "0 0 * * *"  // 每日凌晨更新
  }]
}
```

### 3. 批次查詢
```typescript
// 一次查詢多個基準貨幣
const [usdRates, twdRates] = await Promise.all([
  getExchangeRates(supabase, 'USD'),
  getExchangeRates(supabase, 'TWD')
])
```

## 監控與維護

### 日誌位置
- 開發環境：終端機輸出
- 生產環境：Vercel Logs 或自訂日誌服務

### 監控指標
- API 請求成功率
- 匯率更新頻率
- 資料庫查詢效能
- ExchangeRate-API 配額使用量

### 維護檢查清單
- [ ] 每月檢查 ExchangeRate-API 配額
- [ ] 每週檢查匯率資料完整性
- [ ] 每季檢查 RLS 政策有效性
- [ ] 每年更新支援的貨幣清單

## 相關資源

### 內部文檔
- [修復詳細文檔](./exchange-rates-fix.md)
- [實作報告](./implementation-report-exchange-rates-fix.md)
- [API 路由文檔](../app/api/exchange-rates/README.md)

### 外部資源
- [ExchangeRate-API 文檔](https://www.exchangerate-api.com/docs)
- [Supabase RLS 指南](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

## 版本歷史

### v1.0 (2025-10-16)
- ✅ 初始實作
- ✅ 修復 Supabase 客戶端問題
- ✅ 修復 RLS 權限問題
- ✅ 新增完整文檔

---

**維護者**: Claude AI Backend Developer
**最後更新**: 2025-10-16
