# Proposal: 修正收款統計 API 回應格式

## Why

收款管理頁面載入時發生前端錯誤，導致統計卡片無法顯示。錯誤原因是 API 回應格式與前端期望不符，需要修正 API 路由以符合型別定義。

## What Changes

修改 `/api/payments/statistics` API 端點的回應格式，直接回傳統計資料物件，而非包裹在 `{ statistics: ... }` 中。

**變更檔案**：
- `app/api/payments/statistics/route.ts` - 移除回應包裹層

**不影響**：
- 資料庫函式 `get_payment_statistics()` 保持不變
- 型別定義 `PaymentStatistics` 保持不變

## 問題描述

收款管理頁面 (`/payments`) 載入時發生前端錯誤：

```
TypeError: Cannot read properties of undefined (reading 'total_collected')
```

### 根本原因

API 路由 (`/api/payments/statistics`) 回傳的資料結構與前端期望不符：

**目前 API 回應**：
```json
{
  "statistics": {
    "current_month": { "total_collected": 0, ... },
    "current_year": { ... },
    "overdue": { ... }
  }
}
```

**前端期望**（根據 `hooks/usePayments.ts:112`）：
```typescript
const { data: statistics } = usePaymentStatistics()
// 前端期望 statistics 直接是統計物件，而非包裹在 { statistics: ... } 中
```

**前端使用方式**（`app/[locale]/payments/page.tsx:102`）：
```typescript
{statistics.current_month.total_collected.toLocaleString()}
```

### 影響範圍

- ✅ **只影響前端顯示**：不影響資料庫或其他 API
- ✅ **修復簡單**：只需移除 API 回應的包裹層
- ✅ **無 Breaking Changes**：目前沒有其他地方使用此 API

## 解決方案

修改 `app/api/payments/statistics/route.ts` 的回應格式，直接回傳統計資料：

```diff
- return NextResponse.json({
-   statistics: data,
- })
+ return NextResponse.json(data)
```

## 驗證步驟

1. 修改 API 回應格式
2. 使用 Chrome DevTools 檢查瀏覽器主控台錯誤
3. 確認統計卡片正確顯示數據
4. 確認沒有其他元件受影響

## 其他發現

**非專案問題**：
- `autoinsert.js` 重複宣告錯誤來自瀏覽器擴充套件，非專案程式碼問題
- `ERR_BLOCKED_BY_CONTENT_BLOCKER` 也是瀏覽器擴充套件干擾，不影響功能

## 參考檔案

- `app/api/payments/statistics/route.ts:26-28` - API 回應
- `hooks/usePayments.ts:330-338` - `usePaymentStatistics` hook
- `app/[locale]/payments/page.tsx:97-124` - 統計卡片渲染
- `types/extended.types.ts:543-570` - `CollectionStatistics` 型別定義
