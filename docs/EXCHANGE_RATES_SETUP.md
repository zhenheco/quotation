# 匯率功能設置指南

## 📋 當前狀態

✅ **已完成**:
- 匯率服務模組 (`lib/services/exchange-rate.ts`)
- API Routes (`/api/exchange-rates`, `/api/exchange-rates/sync`)
- Supabase 客戶端整合修復
- 環境變數配置
- Migration SQL 腳本準備完成

⚠️  **待完成**:
- 資料庫 RLS 權限設定 (需要手動執行 SQL)

---

## 🔧 完成設置步驟

### 步驟 1: 套用資料庫 Migration

#### 方法 A: 使用 Supabase Dashboard (推薦)

1. **登入 Supabase Dashboard**
   - 前往: https://supabase.com/dashboard
   - 選擇您的專案

2. **開啟 SQL Editor**
   - 左側選單 → SQL Editor
   - 點擊 "New query"

3. **執行 Migration**
   ```sql
   -- 複製並貼上以下檔案的內容:
   -- supabase-migrations/MANUAL_RLS_FIX.sql
   ```

4. **點擊 "Run" 執行**

5. **驗證設定**
   ```sql
   -- 執行以下查詢確認政策已建立:
   SELECT schemaname, tablename, policyname, permissive, roles, cmd
   FROM pg_policies
   WHERE tablename = 'exchange_rates';
   ```

   **預期結果**: 應該看到 3 個政策
   - `Authenticated users can view exchange rates` (SELECT)
   - `Authenticated users can insert exchange rates` (INSERT)
   - `Authenticated users can update exchange rates` (UPDATE)

#### 方法 B: 使用命令列 (進階)

如果您有 PostgreSQL 客戶端工具:

```bash
# 設定資料庫連線 URL
export SUPABASE_DB_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# 執行 migration
psql "$SUPABASE_DB_URL" -f supabase-migrations/002_fix_exchange_rates_rls.sql
```

---

### 步驟 2: 測試匯率功能

完成 Migration 後，測試 API:

#### 測試 1: 獲取最新匯率

```bash
curl http://localhost:3001/api/exchange-rates | jq '.'
```

**預期回應**:
```json
{
  "success": true,
  "base_currency": "USD",
  "rates": {
    "USD": 1.0,
    "TWD": 30.6022,
    "EUR": 0.8593,
    "JPY": 151.1022,
    "CNY": 7.1281
  },
  "timestamp": "2025-10-16T..."
}
```

#### 測試 2: 手動同步匯率

```bash
curl -X POST http://localhost:3001/api/exchange-rates/sync \
  -H "Content-Type: application/json" \
  -d '{"baseCurrency":"USD"}'
```

**預期回應**:
```json
{
  "success": true,
  "message": "匯率同步成功",
  "timestamp": "2025-10-16T..."
}
```

#### 測試 3: 檢查資料庫

在 Supabase Dashboard > Table Editor:
- 開啟 `exchange_rates` 表
- 應該看到新增的匯率記錄

---

## 🐛 故障排除

### 問題 1: API 返回 403 Forbidden

**症狀**:
```
❌ 獲取匯率失敗: Error: API 請求失敗: 403 Forbidden
```

**可能原因**:
- ExchangeRate-API 金鑰無效
- API 配額已用完
- 網路連線問題

**解決方法**:
1. 檢查 `.env.local` 中的 `EXCHANGE_RATE_API_KEY`
2. 直接測試 API:
   ```bash
   curl "https://v6.exchangerate-api.com/v6/YOUR_API_KEY/latest/USD"
   ```
3. 檢查 API 使用量: https://www.exchangerate-api.com/dashboard

### 問題 2: Permission denied for table exchange_rates

**症狀**:
```
❌ 從資料庫獲取匯率失敗: {
  code: '42501',
  message: 'permission denied for table exchange_rates'
}
```

**解決方法**:
- 確認已執行步驟 1 的 Migration
- 重新檢查 RLS 政策

### 問題 3: 環境變數讀取失敗

**症狀**:
```
❌ EXCHANGE_RATE_API_KEY 未設定
```

**解決方法**:
1. 檢查 `.env.local` 檔案存在
2. 重啟開發伺服器:
   ```bash
   # 停止當前伺服器 (Ctrl+C)
   npm run dev
   ```

---

## 📚 API 文檔

### GET /api/exchange-rates

獲取最新匯率（優先從資料庫讀取快取）

**Query Parameters**:
- `base` (optional): 基準貨幣，預設為 `USD`
  - 可選值: `USD`, `TWD`, `EUR`, `JPY`, `CNY`

**範例**:
```bash
# USD 為基準
curl http://localhost:3001/api/exchange-rates

# TWD 為基準
curl http://localhost:3001/api/exchange-rates?base=TWD
```

### POST /api/exchange-rates/sync

手動從 API 同步最新匯率到資料庫

**Request Body**:
```json
{
  "baseCurrency": "USD"  // optional, 預設為 USD
}
```

**範例**:
```bash
curl -X POST http://localhost:3001/api/exchange-rates/sync \
  -H "Content-Type: application/json" \
  -d '{"baseCurrency":"USD"}'
```

---

## 🔄 自動更新機制 (未來實作)

目前匯率需要手動同步。未來可以實作以下方式自動更新:

### 選項 1: Vercel Cron Jobs

在 `vercel.json` 中配置:
```json
{
  "crons": [{
    "path": "/api/exchange-rates/sync",
    "schedule": "0 0 * * *"  // 每天凌晨 00:00
  }]
}
```

### 選項 2: Supabase Edge Functions

建立定時函數每日更新匯率

### 選項 3: GitHub Actions

使用 GitHub Actions 定時觸發 API

---

## 📝 後續開發建議

### 短期 (本週)
- ✅ 完成 RLS Migration
- [ ] 整合到報價單表單 UI
- [ ] 新增匯率更新時間顯示
- [ ] 新增手動刷新按鈕

### 中期 (1-2 週)
- [ ] 實作自動更新機制
- [ ] 新增匯率歷史查詢
- [ ] 新增匯率變化通知

### 長期 (1 月+)
- [ ] 支援更多貨幣
- [ ] 匯率趨勢圖表
- [ ] 多資料來源聚合

---

## 🎯 下一步行動

1. **立即執行**: 在 Supabase Dashboard 執行 Migration SQL
2. **測試驗證**: 執行上述測試命令
3. **UI 整合**: 開始將匯率功能整合到報價單表單

---

**建立時間**: 2025-10-16
**維護者**: Claude AI Assistant
**狀態**: 🟡 等待 Migration 執行
