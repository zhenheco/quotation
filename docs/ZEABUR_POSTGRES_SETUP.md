# Zeabur PostgreSQL 設定指南

## 📋 概述

本文檔說明如何在混合雲架構中正確設定和使用 Zeabur PostgreSQL 資料庫。

## 🏗️ 架構說明

本專案採用**混合雲架構**:

```
┌─────────────────────────────────────────────────────────┐
│                    應用程式層                              │
│                  Next.js 15 + React 19                   │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
┌──────────────────┐            ┌──────────────────────┐
│  Supabase Cloud  │            │ Zeabur PostgreSQL    │
│                  │            │                      │
│  - Google OAuth  │            │  - exchange_rates    │
│  - auth.users    │            │  - customers         │
│                  │            │  - products          │
│  (認證專用)       │            │  - quotations        │
│                  │            │  - quotation_items   │
│                  │            │                      │
│  🔐 認證系統      │            │  📊 業務資料          │
└──────────────────┘            └──────────────────────┘
```

### 為什麼需要兩個資料庫?

1. **Supabase Cloud**: 專注於認證服務
   - 提供 Google OAuth 整合
   - 管理用戶會話
   - 不儲存業務資料

2. **Zeabur PostgreSQL**: Self-hosted 業務資料庫
   - 完全控制資料
   - 更低的延遲
   - 更靈活的配置

## 🚀 快速開始

### 1. 安裝依賴

```bash
npm install pg @types/pg
```

### 2. 環境變數配置

在 `.env.local` 中添加:

```env
# Zeabur PostgreSQL (選填,有預設值)
ZEABUR_POSTGRES_URL=postgresql://root:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT/zeabur

# ExchangeRate API
EXCHANGE_RATE_API_KEY=your_api_key_here
```

### 3. 初始化資料庫

```bash
npx tsx scripts/setup-zeabur-db.ts
```

**預期輸出:**
```
🔧 連接到 Zeabur PostgreSQL...
✅ 已連接到資料庫

📝 執行 SQL 語句...

1. 啟用 UUID extension...
✅ UUID extension 已啟用

2. 建立 exchange_rates 表...
✅ exchange_rates 表建立成功

3. 建立索引...
✅ 索引建立成功

4. 授予權限給 root 用戶...
✅ 權限授予成功

🔍 驗證 exchange_rates 表...
✅ exchange_rates 表建立成功!

📊 資料庫中的表:
  - exchange_rates

👋 資料庫連接已關閉
```

### 4. 測試 API

#### 同步匯率

```bash
curl -X POST http://localhost:3000/api/exchange-rates/sync \
  -H "Content-Type: application/json" \
  -d '{"baseCurrency":"USD"}'
```

**預期回應:**
```json
{
  "success": true,
  "message": "匯率同步成功",
  "timestamp": "2025-10-16T10:07:31.925Z"
}
```

#### 查詢匯率

```bash
curl "http://localhost:3000/api/exchange-rates?base=USD"
```

**預期回應:**
```json
{
  "success": true,
  "base_currency": "USD",
  "rates": {
    "USD": 1,
    "TWD": 30.6022,
    "EUR": 0.8593,
    "JPY": 151.1022,
    "CNY": 7.1281
  },
  "timestamp": "2025-10-16T10:07:41.815Z"
}
```

## 📁 檔案結構

```
quotation-system/
├── lib/
│   ├── db/
│   │   └── zeabur.ts                    # Zeabur PostgreSQL 客戶端
│   ├── services/
│   │   ├── exchange-rate.ts             # 舊版 (Supabase) - 已棄用
│   │   └── exchange-rate-zeabur.ts      # 新版 (Zeabur) - 使用中 ✅
│   └── supabase/
│       └── server.ts                    # Supabase 認證客戶端
│
├── app/api/exchange-rates/
│   ├── route.ts                         # GET - 查詢匯率
│   └── sync/route.ts                    # POST - 同步匯率
│
├── scripts/
│   └── setup-zeabur-db.ts              # 資料庫初始化腳本
│
└── zeabur-schema.sql                    # 資料庫 Schema
```

## 🔧 技術細節

### 連接池配置

```typescript
// lib/db/zeabur.ts
const pool = new Pool({
  connectionString: process.env.ZEABUR_POSTGRES_URL,
  ssl: false,
  max: 20,                    // 最大連接數
  idleTimeoutMillis: 30000,   // 閒置超時 30 秒
  connectionTimeoutMillis: 2000 // 連接超時 2 秒
})
```

### Exchange Rates 表結構

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

### 支援的貨幣

```typescript
export const SUPPORTED_CURRENCIES = ['TWD', 'USD', 'EUR', 'JPY', 'CNY'] as const
```

## 🐛 常見問題

### Q1: 權限錯誤 "permission denied for table exchange_rates"

**原因:** 使用了 Supabase 客戶端存取 Zeabur PostgreSQL

**解決方案:** 確保 API routes 使用 `exchange-rate-zeabur.ts`:

```typescript
// ✅ 正確
import { getExchangeRates } from '@/lib/services/exchange-rate-zeabur'

// ❌ 錯誤
import { getExchangeRates } from '@/lib/services/exchange-rate'
```

### Q2: 資料表不存在

**原因:** Zeabur PostgreSQL 是空白資料庫

**解決方案:** 執行初始化腳本:

```bash
npx tsx scripts/setup-zeabur-db.ts
```

### Q3: 連接超時

**原因:** 網路問題或連接字串錯誤

**解決方案:**
1. 檢查 `ZEABUR_POSTGRES_URL` 環境變數
2. 確認 Zeabur 服務運行中
3. 檢查防火牆設定

### Q4: API 403 Forbidden

**原因:** ExchangeRate-API 配額用盡或 API key 錯誤

**解決方案:**
1. 檢查 `EXCHANGE_RATE_API_KEY`
2. 登入 ExchangeRate-API 查看配額
3. 如已有資料庫快取,可暫時使用

## 📊 監控與維護

### 查看資料庫資料

```sql
-- 查看所有匯率記錄
SELECT * FROM exchange_rates
ORDER BY date DESC, from_currency, to_currency;

-- 查看最新匯率
SELECT to_currency, rate
FROM exchange_rates
WHERE from_currency = 'USD'
AND date = (SELECT MAX(date) FROM exchange_rates WHERE from_currency = 'USD');

-- 統計資料量
SELECT COUNT(*) as total_records FROM exchange_rates;
```

### 清理舊資料

```sql
-- 刪除 30 天前的匯率記錄
DELETE FROM exchange_rates
WHERE date < NOW() - INTERVAL '30 days';
```

## 🔄 未來計劃

- [ ] 自動定時同步匯率 (Cron Job)
- [ ] 匯率歷史趨勢圖表
- [ ] 支援更多貨幣 (目前 5 種,API 支援 161 種)
- [ ] 匯率變動提醒
- [ ] 將其他業務表遷移到 Zeabur PostgreSQL

## 📚 相關文檔

- [CHANGELOG.md](../CHANGELOG.md) - 版本變更歷史
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 完整架構說明
- [README.md](../README.md) - 專案總覽

---

**更新日期:** 2025-10-16
**維護者:** Claude AI Assistant
