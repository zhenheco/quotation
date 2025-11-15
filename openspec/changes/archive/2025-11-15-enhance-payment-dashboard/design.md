# 設計文件：優化收款管理儀表板

## 架構設計

### 系統層級

```
┌─────────────────────────────────────────────────────────────┐
│                    前端：收款管理頁面                          │
│  /app/[locale]/payments/page.tsx                           │
└──────────────┬──────────────────────────────────────────────┘
               │
               ├─ 統計卡片區（修改）
               │  └─ 移除：收款率
               │  └─ 新增：當月應收總額
               │
               ├─ 當月應收款項表格（新增）
               │  └─ CurrentMonthReceivablesTable 組件
               │     ├─ 勾選標記收款功能
               │     ├─ 報價單編號顯示
               │     └─ 期數資訊顯示
               │
               └─ 已收款/未收款區域（優化）
                  ├─ 增加報價單編號欄位
                  └─ 增加期數資訊欄位

┌─────────────────────────────────────────────────────────────┐
│                        API 層                               │
└──────────────┬──────────────────────────────────────────────┘
               │
               ├─ GET /api/payments/current-month-receivables
               │  └─ 查詢當月所有應收款項（含報價單資訊）
               │
               ├─ POST /api/payments/schedules/:id/mark-collected
               │  └─ 標記款項為已收並創建 payment 記錄
               │
               └─ GET /api/payments/statistics（修改）
                  └─ 回傳統計增加當月應收總額

┌─────────────────────────────────────────────────────────────┐
│                      資料存取層                              │
│  /lib/dal/payments.ts                                      │
└──────────────┬──────────────────────────────────────────────┘
               │
               ├─ getCurrentMonthReceivables()
               │  └─ JOIN payment_schedules + contracts + quotations
               │
               ├─ markScheduleAsCollected()
               │  └─ UPDATE payment_schedules + INSERT payments
               │
               └─ getPaymentStatistics()（修改）
                  └─ 增加當月應收總額計算
```

## 資料模型

### payment_schedules（現有表格）

使用現有欄位，無需 migration：
- `id` - 排程 ID
- `contract_id` - 合約 ID（用於關聯報價單）
- `customer_id` - 客戶 ID
- `schedule_number` - 期數（第幾期）
- `due_date` - 收款日期
- `amount` - 金額
- `currency` - 幣別
- `status` - 狀態（pending/paid/overdue/cancelled）
- `paid_date` - 實際付款日期
- `payment_id` - 關聯的 payment 記錄

### 關聯查詢路徑

```
payment_schedules (當月 due_date)
    ↓ contract_id
customer_contracts
    ↓ quotation_id
quotations
    ↓ quotation_number
```

### 新增查詢索引（建議）

```sql
-- 優化當月應收查詢
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date
ON payment_schedules(due_date, status);

-- 優化合約-報價單關聯查詢
CREATE INDEX IF NOT EXISTS idx_customer_contracts_quotation
ON customer_contracts(quotation_id);
```

## API 設計

### GET /api/payments/current-month-receivables

**用途**：取得當月所有應收款項

**請求參數**：
```typescript
{
  month?: string  // 可選，格式：YYYY-MM，預設為當月
}
```

**回應格式**：
```typescript
interface CurrentMonthReceivable {
  id: string                    // payment_schedule.id
  schedule_number: number       // 第幾期
  total_schedules: number       // 總共幾期

  // 客戶資訊
  customer_id: string
  customer_name_zh: string
  customer_name_en: string

  // 報價單資訊
  quotation_id: string | null
  quotation_number: string | null

  // 合約資訊
  contract_id: string
  contract_number: string
  contract_title: string

  // 款項資訊
  due_date: string              // 收款日期
  amount: number
  currency: string
  status: 'pending' | 'paid' | 'overdue'

  // 收款資訊
  paid_date: string | null
  payment_id: string | null

  // 計算欄位
  days_until_due: number        // 距離收款日天數（負數表示逾期）
  is_overdue: boolean          // 是否逾期
}

interface Response {
  receivables: CurrentMonthReceivable[]
  summary: {
    total_count: number         // 總筆數
    pending_count: number       // 未收筆數
    paid_count: number          // 已收筆數
    overdue_count: number       // 逾期筆數
    total_amount: number        // 總金額
    pending_amount: number      // 未收金額
    paid_amount: number         // 已收金額
    overdue_amount: number      // 逾期金額
    currency: string
  }
}
```

**SQL 查詢邏輯**：
```sql
SELECT
  ps.id,
  ps.schedule_number,
  (SELECT COUNT(*) FROM payment_schedules WHERE contract_id = ps.contract_id) as total_schedules,

  c.id as customer_id,
  c.name as customer_name,

  q.id as quotation_id,
  q.quotation_number,

  ct.id as contract_id,
  ct.contract_number,
  ct.title as contract_title,

  ps.due_date,
  ps.amount,
  ps.currency,
  ps.status,
  ps.paid_date,
  ps.payment_id,

  CAST(julianday(ps.due_date) - julianday('now') AS INTEGER) as days_until_due,
  CASE WHEN ps.due_date < date('now') AND ps.status = 'pending' THEN 1 ELSE 0 END as is_overdue

FROM payment_schedules ps
INNER JOIN customers c ON ps.customer_id = c.id
INNER JOIN customer_contracts ct ON ps.contract_id = ct.id
LEFT JOIN quotations q ON ct.quotation_id = q.id

WHERE ps.user_id = ?
  AND strftime('%Y-%m', ps.due_date) = ?

ORDER BY ps.due_date ASC, ps.schedule_number ASC
```

### POST /api/payments/schedules/:id/mark-collected

**用途**：標記某筆排程為已收

**請求參數**：
```typescript
{
  payment_date: string          // 實際收款日期（ISO 格式）
  amount?: number               // 實際收款金額（可選，預設為 schedule.amount）
  payment_method?: PaymentMethod // 收款方式（可選）
  reference_number?: string     // 參考號碼（可選）
  notes?: string                // 備註（可選）
}
```

**回應格式**：
```typescript
{
  payment_schedule: PaymentSchedule  // 更新後的排程
  payment: Payment                   // 創建的收款記錄
}
```

**業務邏輯**：
1. 驗證 payment_schedule 存在且屬於當前用戶
2. 驗證 status 為 `pending` 或 `overdue`（已收不能重複標記）
3. 創建 payment 記錄
4. 更新 payment_schedule：
   - `status` → `paid`
   - `paid_date` → 請求的 payment_date
   - `paid_amount` → 請求的 amount
   - `payment_id` → 創建的 payment.id
5. 更新 customer_contracts 的 next_collection_date 和 next_collection_amount

**交易處理**：
```typescript
// 使用資料庫 transaction 確保資料一致性
await db.transaction(async (tx) => {
  // 1. 創建 payment 記錄
  const payment = await createPayment(tx, ...)

  // 2. 更新 payment_schedule
  await tx.execute(
    'UPDATE payment_schedules SET status = ?, paid_date = ?, paid_amount = ?, payment_id = ? WHERE id = ?',
    ['paid', payment_date, amount, payment.id, schedule_id]
  )

  // 3. 更新合約的下次收款資訊
  const nextSchedule = await getNextPendingSchedule(tx, contract_id)
  if (nextSchedule) {
    await tx.execute(
      'UPDATE customer_contracts SET next_collection_date = ?, next_collection_amount = ? WHERE id = ?',
      [nextSchedule.due_date, nextSchedule.amount, contract_id]
    )
  } else {
    await tx.execute(
      'UPDATE customer_contracts SET next_collection_date = NULL, next_collection_amount = NULL WHERE id = ?',
      [contract_id]
    )
  }
})
```

### PATCH /api/payments/statistics（修改）

**新增回傳欄位**：
```typescript
{
  current_month: {
    total_collected: number
    total_pending: number
    total_overdue: number
    total_receivable: number   // 新增：當月應收總額（pending + overdue）
    currency: string
  }
  // ... 其他現有欄位
}
```

## 前端組件設計

### 統計卡片區（修改）

**原有 4 張卡片**：
1. 當月已收（保留）
2. 當月未收（保留）
3. 當月逾期（保留）
4. ~~收款率~~（移除）

**新增卡片**：
4. 當月應收總額（新增）
   - 顯示：total_pending + total_overdue
   - 顏色：藍色
   - Icon：💰

### CurrentMonthReceivablesTable（新增組件）

**位置**：統計卡片下方，已收款/未收款區域上方

**設計**：
```typescript
interface CurrentMonthReceivablesTableProps {
  locale: string
}

function CurrentMonthReceivablesTable({ locale }: Props) {
  const { data, isLoading } = useCurrentMonthReceivables()
  const markAsCollected = useMarkScheduleAsCollected()

  const handleMarkCollected = async (scheduleId: string) => {
    await markAsCollected.mutateAsync({
      scheduleId,
      payment_date: new Date().toISOString(),
    })
    toast.success('已標記為收款')
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h3 className="font-semibold">當月應收款項</h3>
        <p className="text-sm text-gray-600">
          共 {data?.summary.total_count} 筆，
          未收 {data?.summary.pending_count} 筆，
          已收 {data?.summary.paid_count} 筆，
          逾期 {data?.summary.overdue_count} 筆
        </p>
      </div>

      <table className="w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="w-12">✓</th>
            <th>報價單編號</th>
            <th>客戶名稱</th>
            <th>期數</th>
            <th>金額</th>
            <th>收款日期</th>
            <th>狀態</th>
          </tr>
        </thead>
        <tbody>
          {data?.receivables.map(item => (
            <tr key={item.id}>
              <td>
                {item.status === 'pending' || item.status === 'overdue' ? (
                  <input
                    type="checkbox"
                    onChange={() => handleMarkCollected(item.id)}
                  />
                ) : (
                  <span className="text-green-500">✓</span>
                )}
              </td>
              <td>{item.quotation_number || '-'}</td>
              <td>{locale === 'zh' ? item.customer_name_zh : item.customer_name_en}</td>
              <td>第 {item.schedule_number} 期/共 {item.total_schedules} 期</td>
              <td>{formatCurrency(item.amount, item.currency)}</td>
              <td>{formatDate(item.due_date)}</td>
              <td>
                <StatusBadge status={item.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**功能特性**：
- 勾選框只在 pending/overdue 狀態顯示
- 已收款項顯示綠色勾號
- 按收款日期排序
- 支援響應式設計（手機版改用卡片式布局）

### PaymentCard 組件優化

**新增顯示欄位**：
- 報價單編號（如果有關聯）
- 期數資訊（如「第 3 期/共 12 期」）

```typescript
<div className="payment-card">
  {/* 現有欄位 */}
  <div className="customer-name">{customerName}</div>
  <div className="amount">{formatCurrency(amount)}</div>

  {/* 新增欄位 */}
  {quotationNumber && (
    <div className="quotation-info">
      <span className="label">報價單：</span>
      <span className="value">{quotationNumber}</span>
    </div>
  )}

  {scheduleInfo && (
    <div className="schedule-info">
      <span className="label">期數：</span>
      <span className="value">
        第 {scheduleInfo.number} 期/共 {scheduleInfo.total} 期
      </span>
    </div>
  )}

  {/* 現有欄位 */}
  <div className="due-date">{formatDate(dueDate)}</div>
</div>
```

## 效能優化策略

### 資料庫查詢優化

1. **索引策略**
   ```sql
   -- 當月應收查詢優化
   CREATE INDEX idx_payment_schedules_due_date ON payment_schedules(due_date, status);

   -- 合約-報價單關聯優化
   CREATE INDEX idx_customer_contracts_quotation ON customer_contracts(quotation_id);

   -- 用戶查詢優化
   CREATE INDEX idx_payment_schedules_user ON payment_schedules(user_id, due_date);
   ```

2. **查詢計畫分析**
   - 使用 `EXPLAIN QUERY PLAN` 驗證查詢使用索引
   - 確保 JOIN 操作高效執行

3. **資料分頁**
   - 當月應收清單預期筆數有限（< 100 筆）
   - 暫不需要分頁，未來可視需求加入

### 前端效能優化

1. **資料快取**
   ```typescript
   const { data } = useCurrentMonthReceivables({
     staleTime: 1000 * 60 * 5,  // 5 分鐘內使用快取
     refetchOnWindowFocus: false,
   })
   ```

2. **樂觀更新**
   ```typescript
   const markAsCollected = useMarkScheduleAsCollected({
     onMutate: async (variables) => {
       // 取消進行中的查詢
       await queryClient.cancelQueries(['current-month-receivables'])

       // 快照當前資料
       const previous = queryClient.getQueryData(['current-month-receivables'])

       // 樂觀更新
       queryClient.setQueryData(['current-month-receivables'], (old) => ({
         ...old,
         receivables: old.receivables.map(item =>
           item.id === variables.scheduleId
             ? { ...item, status: 'paid', paid_date: variables.payment_date }
             : item
         )
       }))

       return { previous }
     },
     onError: (err, variables, context) => {
       // 回復快照
       queryClient.setQueryData(['current-month-receivables'], context.previous)
     },
   })
   ```

3. **虛擬滾動**（未來考慮）
   - 如果資料量增長，可使用 react-virtual 實作虛擬滾動

## 錯誤處理

### API 錯誤處理

```typescript
// POST /api/payments/schedules/:id/mark-collected
try {
  // 驗證
  if (!schedule) {
    return NextResponse.json(
      { error: 'Schedule not found' },
      { status: 404 }
    )
  }

  if (schedule.status === 'paid') {
    return NextResponse.json(
      { error: 'Schedule already paid' },
      { status: 400 }
    )
  }

  // 執行業務邏輯
  const result = await markScheduleAsCollected(...)

  return NextResponse.json(result)

} catch (error) {
  console.error('Mark collected error:', error)
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

### 前端錯誤處理

```typescript
const handleMarkCollected = async (scheduleId: string) => {
  try {
    await markAsCollected.mutateAsync({ scheduleId, ... })
    toast.success('已標記為收款')
  } catch (error) {
    if (error.response?.status === 400) {
      toast.error('此款項已經收款')
    } else if (error.response?.status === 404) {
      toast.error('找不到此款項')
    } else {
      toast.error('標記收款失敗，請稍後再試')
    }
  }
}
```

## 安全性考量

### 權限驗證

1. **API 權限檢查**
   ```typescript
   // 所有 API 端點都需檢查：
   - 用戶已登入
   - payment_schedule.user_id === session.user.id
   ```

2. **RBAC 整合**
   ```typescript
   // 未來可加入角色權限：
   - 財務人員：可標記收款
   - 一般用戶：只能查看
   ```

### 資料驗證

```typescript
// 輸入驗證
const MarkCollectedSchema = z.object({
  payment_date: z.string().datetime(),
  amount: z.number().positive().optional(),
  payment_method: z.enum(['bank_transfer', 'credit_card', 'check', 'cash', 'other']).optional(),
  reference_number: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
})
```

## 測試策略

### 單元測試

```typescript
describe('getCurrentMonthReceivables', () => {
  it('should return receivables for current month', async () => {
    const result = await getCurrentMonthReceivables(db, userId, '2025-11')
    expect(result.receivables).toHaveLength(5)
    expect(result.summary.total_count).toBe(5)
  })

  it('should include quotation number', async () => {
    const result = await getCurrentMonthReceivables(db, userId, '2025-11')
    expect(result.receivables[0].quotation_number).toBe('Q-2025-001')
  })
})

describe('markScheduleAsCollected', () => {
  it('should create payment and update schedule', async () => {
    const result = await markScheduleAsCollected(db, userId, scheduleId, {
      payment_date: '2025-11-15',
    })

    expect(result.payment_schedule.status).toBe('paid')
    expect(result.payment).toBeDefined()
  })

  it('should reject already paid schedule', async () => {
    await expect(
      markScheduleAsCollected(db, userId, paidScheduleId, ...)
    ).rejects.toThrow('Schedule already paid')
  })
})
```

### 整合測試

```typescript
describe('CurrentMonthReceivables API', () => {
  it('GET /api/payments/current-month-receivables', async () => {
    const response = await fetch('/api/payments/current-month-receivables', {
      headers: { Authorization: `Bearer ${token}` }
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.receivables).toBeDefined()
    expect(data.summary).toBeDefined()
  })

  it('POST /api/payments/schedules/:id/mark-collected', async () => {
    const response = await fetch(`/api/payments/schedules/${scheduleId}/mark-collected`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payment_date: '2025-11-15' }),
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.payment_schedule.status).toBe('paid')
  })
})
```

### E2E 測試

```typescript
describe('Payment Dashboard E2E', () => {
  it('should mark receivable as collected', async () => {
    await page.goto('/zh/payments')

    // 查找第一筆未收款項
    const checkbox = await page.locator('table tbody tr:first-child input[type="checkbox"]')
    await checkbox.click()

    // 驗證 toast 訊息
    await expect(page.locator('.toast')).toHaveText('已標記為收款')

    // 驗證統計更新
    const collectedAmount = await page.locator('.stat-card.collected .amount').textContent()
    expect(collectedAmount).toBe('150,000 TWD')  // 更新後的金額

    // 驗證表格更新
    const firstRowStatus = await page.locator('table tbody tr:first-child td:last-child').textContent()
    expect(firstRowStatus).toContain('已收')
  })
})
```

## 部署策略

### 階段性部署

1. **Phase 1：資料庫索引**
   ```sql
   -- 在離峰時段執行
   CREATE INDEX CONCURRENTLY idx_payment_schedules_due_date
   ON payment_schedules(due_date, status);
   ```

2. **Phase 2：後端 API**
   - 部署新增的 API endpoints
   - 確保向後相容（不影響現有功能）

3. **Phase 3：前端組件**
   - 部署新增的 CurrentMonthReceivablesTable
   - 更新統計卡片區
   - 優化 PaymentCard 組件

4. **Phase 4：驗證和監控**
   - 驗證功能正常運作
   - 監控 API 回應時間
   - 收集用戶反饋

### Rollback 計畫

如果遇到問題：
1. 前端可立即 rollback（純 UI 變更）
2. 後端 API 向後相容，rollback 影響小
3. 資料庫索引可保留（不影響現有功能）

## 監控指標

### 效能指標
- GET /api/payments/current-month-receivables 回應時間 < 500ms
- POST /api/payments/schedules/:id/mark-collected 回應時間 < 300ms
- 前端頁面載入時間 < 2s

### 業務指標
- 當月應收查詢使用率
- 標記收款操作成功率
- 每月標記收款筆數

### 錯誤監控
- API 錯誤率 < 1%
- 前端錯誤率 < 0.5%
- Transaction rollback 次數

## 未來擴展

### 短期（1-2 個月）
- 批量標記收款功能
- 匯出當月應收清單（Excel）
- 自動發送收款提醒 Email

### 中期（3-6 個月）
- 收款行事曆視圖
- 逾期款項自動追蹤
- 收款預測和趨勢分析

### 長期（6-12 個月）
- 與電子發票系統整合
- 自動對帳功能
- AI 預測收款風險
