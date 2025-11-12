# payment-statistics-api Specification

## Purpose
TBD - created by archiving change fix-payment-statistics-api-response. Update Purpose after archive.
## Requirements
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

