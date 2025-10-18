# 收款管理功能使用指南

## 目錄

1. [功能概述](#功能概述)
2. [報價單轉合約](#報價單轉合約)
3. [記錄收款](#記錄收款)
4. [查詢未收款](#查詢未收款)
5. [查詢已收款](#查詢已收款)
6. [收款提醒](#收款提醒)
7. [API 參考](#api-參考)

## 功能概述

收款管理系統提供以下功能：

- **報價單轉合約**：當報價被接受時，自動記錄合約資訊
- **自動排程**：根據付款頻率自動產生收款排程
- **逾期偵測**：自動偵測超過30天未收款項目
- **收款追蹤**：完整記錄頭款、期款、尾款等收款資訊
- **提醒系統**：提供下次收款提醒和逾期提醒

## 報價單轉合約

### 使用場景

當客戶接受報價單後，將報價單狀態改為「已簽約」，系統會記錄：
- 合約簽訂日期
- 合約到期日
- 付款頻率（月繳/季繳/半年繳/年繳）
- 下次應收日期
- 下次應收金額

### 範例程式碼

```typescript
// pages/quotations/[id]/accept.tsx
import { supabase } from '@/lib/supabase';
import { PaymentFrequency } from '@/types/extended.types';

async function acceptQuotation(quotationId: string) {
  // 1. 計算合約到期日（假設1年合約）
  const today = new Date();
  const expiryDate = new Date(today);
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  // 2. 計算下次收款日期（下個月5號）
  const nextCollection = new Date(today);
  nextCollection.setMonth(nextCollection.getMonth() + 1);
  nextCollection.setDate(5);

  // 3. 獲取報價總額
  const { data: quotation } = await supabase
    .from('quotations')
    .select('total_amount, currency')
    .eq('id', quotationId)
    .single();

  if (!quotation) return;

  // 4. 根據付款頻率計算每期金額
  const paymentFrequency: PaymentFrequency = 'quarterly'; // 季繳
  const installments = paymentFrequency === 'monthly' ? 12 :
                       paymentFrequency === 'quarterly' ? 4 :
                       paymentFrequency === 'semi_annual' ? 2 : 1;

  const amountPerInstallment = quotation.total_amount / installments;

  // 5. 更新報價單狀態
  const { error } = await supabase
    .from('quotations')
    .update({
      status: 'accepted',
      contract_signed_date: today.toISOString().split('T')[0],
      contract_expiry_date: expiryDate.toISOString().split('T')[0],
      payment_frequency: paymentFrequency,
      next_collection_date: nextCollection.toISOString().split('T')[0],
      next_collection_amount: amountPerInstallment
    })
    .eq('id', quotationId);

  if (error) {
    console.error('Error accepting quotation:', error);
    return;
  }

  // 6. 建立合約記錄
  const { data: contract, error: contractError } = await supabase
    .from('customer_contracts')
    .insert({
      quotation_id: quotationId,
      customer_id: quotation.customer_id,
      contract_number: generateContractNumber(),
      title: `合約 - ${quotation.quotation_number}`,
      start_date: today.toISOString().split('T')[0],
      end_date: expiryDate.toISOString().split('T')[0],
      signed_date: today.toISOString().split('T')[0],
      status: 'active',
      total_amount: quotation.total_amount,
      currency: quotation.currency,
      payment_terms: paymentFrequency
    })
    .select()
    .single();

  if (contractError) {
    console.error('Error creating contract:', contractError);
    return;
  }

  // 7. 產生付款排程（使用資料庫函式）
  const { data: scheduleResult } = await supabase
    .rpc('generate_payment_schedules_for_contract', {
      p_contract_id: contract.id,
      p_start_date: today.toISOString().split('T')[0],
      p_payment_day: 5 // 每月5號收款
    });

  console.log('Payment schedules created:', scheduleResult);
}
```

## 記錄收款

### 使用場景

當收到客戶付款時，記錄收款資訊。系統會自動：
- 更新合約的下次應收日期
- 更新合約的下次應收金額
- 標記相關的付款排程為已付款

### 範例程式碼

```typescript
// pages/payments/new.tsx
import { supabase } from '@/lib/supabase';
import { PaymentType, PaymentMethod } from '@/types/extended.types';

interface RecordPaymentParams {
  contractId: string;
  customerId: string;
  paymentType: PaymentType;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  receiptFile?: File;
  notes?: string;
}

async function recordPayment(params: RecordPaymentParams) {
  // 1. 上傳收據（如果有）
  let receiptUrl: string | null = null;

  if (params.receiptFile) {
    const fileName = `receipts/${Date.now()}_${params.receiptFile.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, params.receiptFile);

    if (!uploadError) {
      receiptUrl = uploadData.path;
    }
  }

  // 2. 記錄收款
  const { data, error } = await supabase
    .from('payments')
    .insert({
      contract_id: params.contractId,
      customer_id: params.customerId,
      payment_type: params.paymentType,
      payment_date: new Date().toISOString().split('T')[0],
      amount: params.amount,
      currency: params.currency,
      payment_method: params.paymentMethod,
      reference_number: params.referenceNumber,
      receipt_url: receiptUrl,
      status: 'confirmed',
      notes: params.notes
    })
    .select()
    .single();

  if (error) {
    console.error('Error recording payment:', error);
    return null;
  }

  // 3. 觸發器會自動更新合約的 next_collection_date
  // 無需手動更新

  return data;
}

// 使用範例
const payment = await recordPayment({
  contractId: 'contract-uuid',
  customerId: 'customer-uuid',
  paymentType: 'installment', // 期款
  amount: 26250,
  currency: 'TWD',
  paymentMethod: 'bank_transfer',
  referenceNumber: 'TXN20251018001',
  notes: '第一期季繳款項'
});
```

## 查詢未收款

### 使用場景

顯示所有超過30天未收款的項目，用於催款和追蹤。

### 範例程式碼

```typescript
// pages/payments/unpaid.tsx
import { supabase } from '@/lib/supabase';
import { UnpaidPaymentRecord } from '@/types/extended.types';

async function getUnpaidPayments(): Promise<UnpaidPaymentRecord[]> {
  const { data, error } = await supabase
    .from('unpaid_payments_30_days')
    .select('*')
    .order('days_overdue', { ascending: false });

  if (error) {
    console.error('Error fetching unpaid payments:', error);
    return [];
  }

  return data;
}

// 使用範例
const unpaidPayments = await getUnpaidPayments();

// 顯示在表格中
<table>
  <thead>
    <tr>
      <th>客戶</th>
      <th>合約編號</th>
      <th>應收日期</th>
      <th>金額</th>
      <th>逾期天數</th>
      <th>提醒次數</th>
      <th>操作</th>
    </tr>
  </thead>
  <tbody>
    {unpaidPayments.map(payment => (
      <tr key={payment.id}>
        <td>{payment.customer_name_zh}</td>
        <td>{payment.contract_number}</td>
        <td>{payment.due_date}</td>
        <td>{payment.amount} {payment.currency}</td>
        <td className="text-red-600">{payment.days_overdue} 天</td>
        <td>{payment.reminder_count}</td>
        <td>
          <button onClick={() => sendReminder(payment.id)}>
            發送提醒
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

## 查詢已收款

### 使用場景

顯示所有已確認的收款記錄，包含頭款、期款、尾款分類。

### 範例程式碼

```typescript
// pages/payments/collected.tsx
import { supabase } from '@/lib/supabase';
import { CollectedPaymentRecord } from '@/types/extended.types';

async function getCollectedPayments(
  customerId?: string
): Promise<CollectedPaymentRecord[]> {
  let query = supabase
    .from('collected_payments_summary')
    .select('*')
    .order('payment_date', { ascending: false });

  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching collected payments:', error);
    return [];
  }

  return data;
}

// 使用範例
const collectedPayments = await getCollectedPayments();

// 按類型分組顯示
const groupedByType = collectedPayments.reduce((acc, payment) => {
  const type = payment.payment_type_display;
  if (!acc[type]) acc[type] = [];
  acc[type].push(payment);
  return acc;
}, {} as Record<string, CollectedPaymentRecord[]>);

<div>
  <h2>已收款記錄</h2>

  {Object.entries(groupedByType).map(([type, payments]) => (
    <div key={type}>
      <h3>{type}</h3>
      <table>
        <thead>
          <tr>
            <th>客戶</th>
            <th>收款日期</th>
            <th>金額</th>
            <th>付款方式</th>
            <th>參考號碼</th>
            <th>收據</th>
          </tr>
        </thead>
        <tbody>
          {payments.map(payment => (
            <tr key={payment.id}>
              <td>{payment.customer_name_zh}</td>
              <td>{payment.payment_date}</td>
              <td>{payment.amount} {payment.currency}</td>
              <td>{payment.payment_method}</td>
              <td>{payment.reference_number}</td>
              <td>
                {payment.receipt_url && (
                  <a href={payment.receipt_url} target="_blank">
                    查看
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ))}
</div>
```

## 收款提醒

### 使用場景

顯示即將到期和已逾期的收款項目，用於主動提醒。

### 範例程式碼

```typescript
// pages/dashboard/collection-reminders.tsx
import { supabase } from '@/lib/supabase';
import { NextCollectionReminder } from '@/types/extended.types';

async function getCollectionReminders(): Promise<NextCollectionReminder[]> {
  const { data, error } = await supabase
    .from('next_collection_reminders')
    .select('*')
    .in('collection_status', ['overdue', 'due_today', 'due_soon'])
    .order('next_collection_date', { ascending: true });

  if (error) {
    console.error('Error fetching collection reminders:', error);
    return [];
  }

  return data;
}

// 使用範例
const reminders = await getCollectionReminders();

// 按狀態分組
const overdueReminders = reminders.filter(r => r.collection_status === 'overdue');
const dueTodayReminders = reminders.filter(r => r.collection_status === 'due_today');
const dueSoonReminders = reminders.filter(r => r.collection_status === 'due_soon');

<div className="dashboard">
  <div className="alert alert-error">
    <h3>逾期未收款 ({overdueReminders.length})</h3>
    {overdueReminders.map(reminder => (
      <div key={reminder.contract_id} className="reminder-item">
        <strong>{reminder.customer_name_zh}</strong>
        <span>{reminder.contract_number}</span>
        <span className="text-red-600">
          逾期 {Math.abs(reminder.days_until_collection)} 天
        </span>
        <span>{reminder.next_collection_amount} {reminder.currency}</span>
        <button onClick={() => sendUrgentReminder(reminder)}>
          緊急催款
        </button>
      </div>
    ))}
  </div>

  <div className="alert alert-warning">
    <h3>今日應收 ({dueTodayReminders.length})</h3>
    {dueTodayReminders.map(reminder => (
      <div key={reminder.contract_id} className="reminder-item">
        <strong>{reminder.customer_name_zh}</strong>
        <span>{reminder.contract_number}</span>
        <span>{reminder.next_collection_amount} {reminder.currency}</span>
      </div>
    ))}
  </div>

  <div className="alert alert-info">
    <h3>7日內到期 ({dueSoonReminders.length})</h3>
    {dueSoonReminders.map(reminder => (
      <div key={reminder.contract_id} className="reminder-item">
        <strong>{reminder.customer_name_zh}</strong>
        <span>{reminder.contract_number}</span>
        <span>
          {reminder.days_until_collection} 天後到期
        </span>
        <span>{reminder.next_collection_amount} {reminder.currency}</span>
      </div>
    ))}
  </div>
</div>
```

## API 參考

### 資料庫函式

#### `generate_payment_schedules_for_contract()`

自動產生合約的付款排程。

```sql
SELECT generate_payment_schedules_for_contract(
  p_contract_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_payment_day INTEGER DEFAULT 5
) RETURNS INTEGER;
```

**參數：**
- `p_contract_id`: 合約 UUID
- `p_start_date`: 起始日期（可選，預設為合約開始日期）
- `p_payment_day`: 每月收款日（1-31，預設為5號）

**回傳：** 產生的排程數量

#### `mark_overdue_payments()`

批次標記所有逾期付款（建議每日執行）。

```sql
SELECT * FROM mark_overdue_payments();
```

**回傳：**
- `updated_count`: 更新的記錄數
- `schedule_ids`: 更新的排程 UUID 陣列

### 視圖

#### `unpaid_payments_30_days`

查詢超過30天未收款的項目。

```typescript
const { data } = await supabase
  .from('unpaid_payments_30_days')
  .select('*')
  .order('days_overdue', { ascending: false });
```

#### `collected_payments_summary`

查詢所有已確認的收款記錄。

```typescript
const { data } = await supabase
  .from('collected_payments_summary')
  .select('*')
  .eq('customer_id', customerId)
  .order('payment_date', { ascending: false });
```

#### `next_collection_reminders`

查詢下次收款提醒。

```typescript
const { data } = await supabase
  .from('next_collection_reminders')
  .select('*')
  .in('collection_status', ['overdue', 'due_today', 'due_soon'])
  .order('next_collection_date', { ascending: true });
```

### 觸發器

#### `trigger_update_next_collection_date`

當記錄收款時，自動更新合約的下次應收資訊。

**觸發條件：** 在 `payments` 表 INSERT 或 UPDATE 之後

**自動執行：**
1. 計算下次收款日期（根據付款頻率）
2. 更新 `customer_contracts.next_collection_date`
3. 更新 `customer_contracts.next_collection_amount`
4. 更新關聯報價單的下次應收資訊

#### `trigger_check_payment_schedules_overdue`

當付款排程到期時，自動標記為逾期。

**觸發條件：** 在 `payment_schedules` 表 INSERT 或 UPDATE 之前

**自動執行：**
1. 檢查 `due_date` 是否小於當前日期
2. 如果是且狀態為 `pending`，則設為 `overdue`
3. 計算並設定 `days_overdue`

## 常見問題

### Q: 如何修改預設收款日？

A: 在產生付款排程時指定 `p_payment_day` 參數：

```sql
SELECT generate_payment_schedules_for_contract(
  'contract-uuid',
  NULL,
  10  -- 改為每月10號收款
);
```

### Q: 如何手動調整付款排程？

A: 直接更新 `payment_schedules` 表即可：

```typescript
await supabase
  .from('payment_schedules')
  .update({
    due_date: '2025-12-05',
    amount: 30000
  })
  .eq('id', scheduleId);
```

### Q: 如何發送收款提醒郵件？

A: 可以使用 Edge Function 或後端 API：

```typescript
// api/send-payment-reminder.ts
export async function sendPaymentReminder(scheduleId: string) {
  // 1. 查詢付款排程資訊
  const { data: schedule } = await supabase
    .from('payment_schedules')
    .select(`
      *,
      customers (email, name),
      customer_contracts (contract_number)
    `)
    .eq('id', scheduleId)
    .single();

  if (!schedule) return;

  // 2. 發送郵件（使用您的郵件服務）
  await sendEmail({
    to: schedule.customers.email,
    subject: '收款提醒',
    body: `
      親愛的 ${schedule.customers.name},

      您的合約 ${schedule.customer_contracts.contract_number}
      有一筆款項即將到期：

      到期日期：${schedule.due_date}
      應繳金額：${schedule.amount} ${schedule.currency}

      請儘快完成付款。
    `
  });

  // 3. 更新提醒記錄
  await supabase
    .from('payment_schedules')
    .update({
      last_reminder_sent_at: new Date().toISOString(),
      reminder_count: schedule.reminder_count + 1
    })
    .eq('id', scheduleId);
}
```

## 相關資源

- [Migration Guide](../migrations/004_MIGRATION_GUIDE.md)
- [TypeScript Types](../types/extended.types.ts)
- [Database Schema](../migrations/004_contracts_and_payments_enhancement.sql)
- [Test Script](../migrations/004_test_migration.sql)
