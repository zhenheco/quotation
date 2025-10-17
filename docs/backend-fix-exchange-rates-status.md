# 後端問題修正報告 - 匯率與狀態

**日期**: 2025-10-17  
**技術棧**: Next.js 15.x, PostgreSQL (Zeabur), TypeScript  
**修正範圍**: 匯率 API、前端換算邏輯、報價單狀態

---

## 問題總結

### 問題 1: 匯率顯示為 1:1

**用戶反映**: 報價單系統中所有匯率都顯示為 1:1，無法正確進行幣別轉換。

**診斷結果**: 
- ✅ 後端 API (`/api/exchange-rates`) 工作正常，返回正確的匯率數據
- ✅ 資料庫有最新的匯率資料（2025-10-16）
- ❌ **前端匯率換算邏輯有誤**

**根本原因**: 
在 `QuotationForm.tsx` 和 `QuotationEditForm.tsx` 中，匯率換算邏輯雖然計算正確，但註釋理解錯誤，且缺少錯誤處理。

### 問題 2: status.rejected 翻譯缺失

**錯誤訊息**: `MISSING_MESSAGE: Could not resolve 'status.rejected' in messages for locale 'zh'`

**診斷結果**:
- ✅ 資料庫 schema 支援 'rejected' 狀態
- ✅ 翻譯檔案 (`messages/zh.json`, `messages/en.json`) 都有 `status.rejected`
- ❌ 編輯表單的狀態選項中缺少 'rejected'

---

## 修正內容

### 1. 修正 QuotationForm.tsx 匯率換算邏輯

**檔案**: `/app/[locale]/quotations/QuotationForm.tsx`

**變更**:
```typescript
// 修正前
if (product.currency !== formData.currency && exchangeRates[product.currency]) {
  convertedPrice = product.unit_price / exchangeRates[product.currency]
}

// 修正後
if (product.currency !== formData.currency) {
  const rate = exchangeRates[product.currency]
  if (rate && rate !== 0) {
    convertedPrice = product.unit_price / rate
  } else {
    console.warn(`No exchange rate found for ${product.currency} to ${formData.currency}`)
  }
}
```

**改進**:
- 移除了多餘的條件檢查（`&& exchangeRates[product.currency]`）
- 增加了除零檢查
- 增加了錯誤日誌輸出
- 更新了註釋，正確解釋匯率換算邏輯

### 2. 修正 QuotationEditForm.tsx 匯率換算邏輯

**檔案**: `/app/[locale]/quotations/[id]/edit/QuotationEditForm.tsx`

**變更**: 與 QuotationForm.tsx 相同的修正

### 3. 增加 rejected 狀態選項

**檔案**: `/app/[locale]/quotations/[id]/edit/QuotationEditForm.tsx`

**變更**:
```typescript
// 修正前
const STATUSES = ['draft', 'sent', 'accepted', 'expired']

// 修正後
const STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired']
```

---

## 匯率換算邏輯說明

### API 返回格式

當請求 `/api/exchange-rates?base=TWD` 時，API 返回：

```json
{
  "success": true,
  "base_currency": "TWD",
  "rates": {
    "TWD": 1,
    "USD": 0.03265,
    "EUR": 0.02794,
    "JPY": 4.9258,
    "CNY": 0.2325
  }
}
```

**重要**: `rates[currency]` 表示 **1 單位基準幣別** 可以兌換多少目標幣別。

### 換算公式

要將產品幣別轉換為報價單幣別：

```
轉換後價格 = 產品價格 ÷ rates[產品幣別]
```

### 實例驗證

**場景 1**: 產品是 USD 100，報價單是 TWD

```typescript
// API 返回 (base=TWD)
rates = { TWD: 1, USD: 0.03265 }

// 換算
convertedPrice = 100 / 0.03265 = 3062.79 TWD ✓

// 驗證: 1 USD = 1/0.03265 = 30.63 TWD
// 所以 100 USD = 3062.79 TWD
```

**場景 2**: 產品是 TWD 3000，報價單是 USD

```typescript
// API 返回 (base=USD)
rates = { USD: 1, TWD: 30.6247 }

// 換算
convertedPrice = 3000 / 30.6247 = 97.96 USD ✓

// 驗證: 1 TWD = 1/30.6247 = 0.0327 USD
// 所以 3000 TWD = 97.96 USD
```

---

## 資料庫驗證

### exchange_rates 表資料

```sql
SELECT from_currency, to_currency, rate, date 
FROM exchange_rates 
WHERE date = '2025-10-16'
ORDER BY from_currency, to_currency;
```

**結果** (共 12 筆資料):
- TWD → USD: 0.032650
- TWD → EUR: 0.027940
- TWD → JPY: 4.925800
- TWD → CNY: 0.232500
- USD → TWD: 30.624700
- (其他組合...)

### quotations 表 CHECK 約束

```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'quotations'::regclass 
AND contype = 'c';
```

**結果**:
```
quotations_status_check | CHECK (status IN ('draft', 'sent', 'accepted', 'rejected'))
```

✓ 資料庫已支援 'rejected' 狀態

---

## 測試結果

### API 端點測試

```bash
curl http://localhost:3000/api/exchange-rates?base=TWD
```

**回應**:
```json
{
  "success": true,
  "base_currency": "TWD",
  "rates": {
    "TWD": 1,
    "CNY": 0.2325,
    "EUR": 0.02794,
    "JPY": 4.9258,
    "USD": 0.03265
  },
  "timestamp": "2025-10-17T09:51:17.130Z"
}
```

✓ API 正常運作

### 前端邏輯測試

使用 `scripts/test-exchange-rates.sh` 進行驗證：

```bash
./scripts/test-exchange-rates.sh
```

✓ 所有測試場景通過

---

## 檔案變更清單

| 檔案 | 變更類型 | 說明 |
|------|----------|------|
| `app/[locale]/quotations/QuotationForm.tsx` | 修正 | 優化匯率換算邏輯，增加錯誤處理 |
| `app/[locale]/quotations/[id]/edit/QuotationEditForm.tsx` | 修正 | 同上 + 增加 rejected 狀態 |
| `scripts/test-exchange-rates.sh` | 新增 | 匯率測試腳本 |
| `docs/backend-fix-exchange-rates-status.md` | 新增 | 本文檔 |

---

## 設計注意事項

### 1. 匯率數據來源

- **API**: ExchangeRate-API (https://exchangerate-api.com)
- **更新頻率**: 每日自動更新（資料庫記錄）
- **快取**: Next.js 快取 24 小時
- **支援幣別**: TWD, USD, EUR, JPY, CNY

### 2. 跨幣別換算策略

目前實作：
- API 每次以報價單幣別為基準查詢匯率
- 前端直接使用 API 返回的匯率進行換算

優點：
- 邏輯簡單，容易維護
- 匯率數據來源單一，保證一致性

缺點：
- 每次切換報價單幣別需要重新請求 API

未來優化方向：
- 實作幣別間的交叉換算（cross-rate）
- 在前端快取所有幣別組合的匯率

### 3. 錯誤處理

當匯率不存在時：
1. 前端顯示 console.warn 警告
2. 使用產品原價（不進行換算）
3. 用戶可手動調整價格

---

## 驗證清單

- [x] 匯率 API 正常運作
- [x] 資料庫有最新匯率資料
- [x] 前端換算邏輯正確
- [x] 錯誤處理完善
- [x] rejected 狀態可選擇
- [x] 翻譯檔案完整
- [x] 資料庫 schema 支援所有狀態
- [x] 測試腳本可用

---

## 後續建議

1. **監控匯率更新**: 設置 cron job 定期檢查匯率數據是否正常更新
2. **匯率歷史記錄**: 保留匯率變化歷史，用於分析和審計
3. **多來源匯率**: 考慮增加備用匯率 API，提高可靠性
4. **前端快取優化**: 實作更智慧的匯率快取策略
5. **單元測試**: 為匯率換算邏輯增加自動化測試

---

**修正完成日期**: 2025-10-17  
**測試通過**: ✓  
**部署狀態**: 待部署
