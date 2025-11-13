# payment-statistics-api Spec Delta

## MODIFIED Requirements

### Requirement: Payment statistics API SHALL query D1 instead of Supabase RPC

The `/api/payments/statistics` endpoint MUST retrieve payment statistics from D1 database using DAL functions, replacing the previous Supabase `get_payment_statistics` RPC call.

**變更前**（使用 Supabase RPC）：
```typescript
const { data } = await supabase.rpc('get_payment_statistics')
```

**變更後**（使用 D1 DAL）：
```typescript
import { getPaymentStatistics } from '@/lib/dal/payments'
const data = await getPaymentStatistics(db, user.id)
```

#### Scenario: 前端取得統計資料（資料來源變更為 D1）

**Given**：
- 使用者已登入
- 收款管理頁面已載入
- `usePaymentStatistics()` hook 被呼叫

**When**：
- API 呼叫 `getPaymentStatistics(db, user.id)` from D1
- D1 計算本月、本年、逾期款項統計

**Then**：
- API 回傳格式保持不變（符合 `PaymentStatistics` 型別）
- 統計卡片顯示正確數值
- 無型別錯誤或資料不一致

#### Scenario: D1 SQL 計算與 Supabase RPC 等效

**Given**：
- Previous implementation used Supabase SQL function
- New implementation uses D1 SQL in DAL

**When**：
- `getPaymentStatistics()` queries D1 payments table
- Calculates aggregations for current month, current year, overdue

**Then**：
- Results match previous Supabase RPC results
- All date calculations work correctly in SQLite (D1)
- Currency grouping produces same output structure

#### Scenario: 統計資料反映 D1 即時數據

**Given**：
- User has pending and confirmed payments in D1
**When**：
- New payment is added to D1
**And**: Statistics API is called
**Then**：
- Statistics include the newly added payment
**And**: No caching issues prevent fresh data
**And**: Dashboard reflects current D1 state
