# Spec: 收款統計 API 回應格式

## ADDED Requirements

### Requirement: Payment statistics API SHALL return unwrapped statistics object

The `/api/payments/statistics` endpoint MUST return a JSON response that directly matches the `PaymentStatistics` interface, without wrapping the data in an additional `statistics` property.

**變更前**：
```json
{
  "statistics": {
    "current_month": { "total_collected": 0, "total_pending": 0, "total_overdue": 0, "currency": "TWD" },
    "current_year": { "total_collected": 0, "total_pending": 0, "total_overdue": 0, "currency": "TWD" },
    "overdue": { "count": 0, "total_amount": 0, "average_days": 0 }
  }
}
```

**變更後**：
```json
{
  "current_month": { "total_collected": 0, "total_pending": 0, "total_overdue": 0, "currency": "TWD" },
  "current_year": { "total_collected": 0, "total_pending": 0, "total_overdue": 0, "currency": "TWD" },
  "overdue": { "count": 0, "total_amount": 0, "average_days": 0 }
}
```

#### Scenario: 前端成功取得並顯示統計資料

**Given**：
- 使用者已登入
- 收款管理頁面已載入
- `usePaymentStatistics()` hook 被呼叫

**When**：
- API 回傳統計資料

**Then**：
- `statistics.current_month.total_collected` 可被正確存取
- 統計卡片顯示正確數值
- 無 `TypeError: Cannot read properties of undefined` 錯誤

#### Scenario: API 型別與前端期望一致

**Given**：
- `PaymentStatistics` 型別定義在 `types/extended.types.ts`
- `usePaymentStatistics()` 使用 `apiGet<PaymentStatistics>('/api/payments/statistics')`

**When**：
- TypeScript 編譯器檢查型別

**Then**：
- 無型別錯誤
- API 回應符合 `PaymentStatistics` 介面

#### Scenario: 資料庫函式回傳格式保持不變

**Given**：
- `get_payment_statistics()` SQL 函式存在於資料庫

**When**：
- API 呼叫 `supabase.rpc('get_payment_statistics')`

**Then**：
- 函式回傳 JSONB 格式統計資料
- 包含 `current_month`, `current_year`, `overdue` 三個欄位
- API 路由直接將此資料回傳給前端

## 實作細節

### 檔案：`app/api/payments/statistics/route.ts`

**修改**：第 26-28 行

```typescript
// 變更前
return NextResponse.json({
  statistics: data,
})

// 變更後
return NextResponse.json(data)
```

### 型別定義保持不變

`hooks/usePayments.ts:112` 中的型別：
```typescript
export interface PaymentStatistics {
  current_month: {
    total_collected: number
    total_pending: number
    total_overdue: number
    currency: string
  }
  current_year: {
    total_collected: number
    total_pending: number
    total_overdue: number
    currency: string
  }
  overdue: {
    count: number
    total_amount: number
    average_days: number
  }
}
```

### 前端使用方式保持不變

`app/[locale]/payments/page.tsx:97-124` 中的使用：
```typescript
const { data: statistics } = usePaymentStatistics()

// 直接存取
{statistics.current_month.total_collected.toLocaleString()}
{statistics.current_month.total_pending.toLocaleString()}
{statistics.current_month.total_overdue.toLocaleString()}
```

## 測試驗證

### 單元測試（手動驗證）

1. **API 回應格式**：
   ```bash
   curl http://localhost:3000/api/payments/statistics \
     -H "Authorization: Bearer <token>"
   ```

   預期輸出：
   ```json
   {
     "current_month": { ... },
     "current_year": { ... },
     "overdue": { ... }
   }
   ```

2. **前端渲染**：
   - 開啟收款管理頁面
   - 使用 Chrome DevTools 檢查 Network 標籤
   - 確認 API 回應格式正確
   - 確認統計卡片顯示數據

3. **型別檢查**：
   ```bash
   pnpm run typecheck
   ```

## 回歸影響

### 不影響範圍

- ✅ 資料庫函式 `get_payment_statistics()`
- ✅ 型別定義 `PaymentStatistics`
- ✅ 其他 API 端點

### 影響範圍

- ⚠️ `app/api/payments/statistics/route.ts` 回應格式
- ✅ `app/[locale]/payments/page.tsx` 統計卡片渲染（修正後正常）

## 相依性

- **資料庫函式**：`get_payment_statistics()` 必須存在並可執行
- **認證**：使用者必須已登入 (`auth.uid()` 不為 null)
- **Supabase Client**：`createApiClient(request)` 正常運作

## 安全性考量

- ✅ 使用 `SECURITY DEFINER` 確保資料隔離
- ✅ RPC 函式檢查 `auth.uid()` 確保只回傳當前使用者的統計資料
- ✅ API 路由檢查使用者認證狀態
