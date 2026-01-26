# 滾動修復與價格統一設計

**日期**: 2026-01-26
**狀態**: 待實作

---

## 問題描述

1. **滾動問題**: 首頁和訂閱頁在桌面瀏覽器無法上下滾動
2. **價格不統一**: 首頁硬編碼價格與資料庫價格不同步
3. **金流服務硬編碼**: `affiliate-payment.ts` 中的價格也是硬編碼

---

## 修復方案

### 1. 滾動問題修復

**根因**: `prevent-overscroll.css` 和 `layout.tsx` 設定了 `height: 100%` 在 `html` 元素上，限制頁面高度為視窗高度。

**修復**:
- `app/prevent-overscroll.css` 第 8 行: 移除 `height: 100% !important`
- `app/layout.tsx` 第 55 行: 移除 `height: '100%'`
- 保留 `overscroll-behavior: none` 和 `overflow-x: hidden`

### 2. 首頁價格從 API 讀取

**現況**: `app/components/home/PricingPreview.tsx` 硬編碼了 `previewPlans` 陣列。

**修復**:
- 將元件改為 Client Component (`'use client'`)
- 使用 `useSubscriptionPlans()` hook 從 API 讀取
- 加入載入狀態處理
- 只顯示 STARTER、STANDARD、PROFESSIONAL 三個付費方案

### 3. 金流服務價格從資料庫讀取

**現況**: `lib/services/affiliate-payment.ts` 第 66-79 行硬編碼了 `PLAN_PRICES`。

**修復**:
- 新增從資料庫讀取價格的函數
- 修改 `createSubscriptionPayment` 和 `createRecurringSubscriptionPayment`
- 使用 DAL 層查詢 `subscription_plans` 表

---

## 資料庫價格（真實來源）

| 方案 | 月費 | 年費 |
|------|------|------|
| FREE | 0 | 0 |
| STARTER | 299 | 2,990 |
| STANDARD | 799 | 7,990 |
| PROFESSIONAL | 1,999 | 19,990 |

---

## SDK 驗證結果

### 金流 SDK ✅
- Endpoint: `/api/payment/create`
- Headers: `X-API-Key`, `X-Site-Code`
- 回傳欄位: `payuniForm`

### 聯盟行銷 SDK ✅
- `/api/tracking/click`: 無需認證，`productCode` 自動帶入
- `/api/tracking/registration`: `x-webhook-secret` header
- `/api/commissions/create`: `x-webhook-secret` header

---

## 環境變數確認清單

```bash
# 金流
AFFILIATE_PAYMENT_API_KEY=
AFFILIATE_PAYMENT_SITE_CODE=
AFFILIATE_PAYMENT_WEBHOOK_SECRET=
AFFILIATE_PAYMENT_ENV=production

# 聯盟行銷
AFFILIATE_SYSTEM_URL=https://affiliate.1wayseo.com
AFFILIATE_WEBHOOK_SECRET=
AFFILIATE_PRODUCT_CODE=quote24
```

---

## 檔案變更清單

1. `app/prevent-overscroll.css` - 移除 height 設定
2. `app/layout.tsx` - 移除 height 設定
3. `app/components/home/PricingPreview.tsx` - 改為從 API 讀取
4. `lib/services/affiliate-payment.ts` - 改為從資料庫讀取價格
