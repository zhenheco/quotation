# 合約與付款管理模組整合文檔

## 概述

合約與付款管理模組已成功整合到新的 React Query hooks 系統中，提供完整的資料管理、自動刷新、快取、樂觀更新和錯誤處理功能。

## 整合日期

2025-01-25

## 已完成的整合

### 1. 合約列表頁面 (`app/[locale]/contracts/page.tsx`)

#### 變更內容

**之前：**
- 使用舊的 hooks 結構 (`useContracts()` 返回 `{ contracts, loading, error }`)
- 手動計算逾期合約
- 缺少自動刷新機制

**之後：**
- 使用新的 React Query hooks
- 使用 `useContracts(filters)` 取得過濾後的合約列表
- 使用 `useOverdueContracts()` 自動取得逾期合約（5 分鐘自動刷新）
- 使用 `useExpiringContracts()` 取得即將到期的合約（30 天內）
- 使用 `useDeleteContract()` 處理刪除操作（含樂觀更新）

#### 主要功能

1. **逾期合約警告**
   - 自動每 5 分鐘刷新逾期合約列表
   - 顯示逾期合約數量
   - 紅色警告提示

2. **即將到期警告**
   - 自動計算 30 天內到期的合約
   - 黃色提示框
   - 提前提醒收款

3. **過濾功能**
   - 全部、進行中、已到期、逾期
   - 搜尋功能（合約編號、標題、客戶名稱）
   - 支援 API 端過濾

4. **刪除功能**
   - 樂觀更新：立即從 UI 移除
   - 確認對話框
   - Toast 通知
   - 失敗時自動還原

#### 程式碼範例

```tsx
// 使用新的 hooks
const { data: allContracts, isLoading, error } = useContracts(filters)
const { data: overdueContracts } = useOverdueContracts() // 自動 5 分鐘刷新
const { data: expiringContracts } = useExpiringContracts()
const deleteContract = useDeleteContract()

// 刪除操作
const handleDelete = async (contractId: string) => {
  if (!confirm(t('contracts.confirmDelete'))) return

  try {
    await deleteContract.mutateAsync(contractId)
    toast.success(t('contracts.deleteSuccess'))
  } catch (error) {
    toast.error(error.message)
  }
}
```

### 2. ContractCard 元件 (`components/contracts/ContractCard.tsx`)

#### 變更內容

**之前：**
- 接收 `progress` prop 從父元件
- 需要手動管理付款進度資料

**之後：**
- 使用 `useContractProgress(contract.id)` 自動取得付款進度
- 移除 `progress` prop
- 每個卡片獨立取得自己的付款進度（2 分鐘刷新）
- 添加 `onDelete` prop 支援刪除功能

#### 主要功能

1. **自動載入付款進度**
   - 每個合約卡片獨立取得付款進度
   - 自動 2 分鐘刷新
   - 顯示總金額、已付、待付、逾期金額
   - 完成度進度條

2. **付款記錄按鈕**
   - 導航到付款頁面並帶入合約 ID
   - 僅在合約狀態為「進行中」時顯示

3. **刪除按鈕**
   - 可選的 `onDelete` prop
   - 紅色按鈕設計

#### 程式碼範例

```tsx
// ContractCard 內部自動取得付款進度
function ContractCard({ contract, locale, onDelete }) {
  const { data: progress, isLoading: progressLoading } = useContractProgress(contract.id)

  return (
    <div>
      {progress && <PaymentProgressBar {...progress} />}
      {onDelete && (
        <button onClick={onDelete}>{t('common.delete')}</button>
      )}
    </div>
  )
}
```

### 3. 合約詳情頁面 (`app/[locale]/contracts/[id]/page.tsx`)

#### 新建頁面

完整的合約詳情頁面，包含：

**主要功能：**

1. **合約資訊顯示**
   - 合約編號、客戶名稱、狀態
   - 簽約日期、開始日期、結束日期
   - 總金額、付款頻率

2. **付款進度追蹤**
   - 使用 `useContractDetail(id)` 同時取得合約和付款進度
   - 視覺化進度條
   - 已付/待付/逾期金額統計

3. **付款歷史記錄**
   - 使用 `useContractPayments(contractId)` 取得所有付款記錄
   - 按時間排序
   - 顯示付款方式、金額、日期、備註

4. **下次收款管理**
   - 顯示當前下次收款日期和金額
   - 表單更新下次收款資訊
   - 使用 `useUpdateNextCollection()` mutation
   - Toast 反饋

5. **快速操作**
   - 記錄付款（導航到付款頁面）
   - 發送提醒（Toast 通知）

#### 程式碼範例

```tsx
function ContractDetailPage({ params }) {
  const { id } = use(params)

  // 同時取得合約和付款進度
  const { contract, progress, isLoading, error } = useContractDetail(id)

  // 取得該合約的所有付款記錄
  const { data: payments } = useContractPayments(id)

  // 更新下次收款
  const updateNextCollection = useUpdateNextCollection(id)

  const handleUpdate = async (date, amount) => {
    await updateNextCollection.mutateAsync({
      next_collection_date: date,
      next_collection_amount: amount
    })
    toast.success('更新成功')
  }
}
```

### 4. 付款列表頁面 (`app/[locale]/payments/page.tsx`)

#### 變更內容

**之前：**
- 使用舊的 hooks 結構
- 缺少提醒功能
- 統計資料不會自動刷新

**之後：**
- 完整整合所有付款相關 hooks
- 自動刷新機制
- 付款提醒功能
- 完整的統計資料

#### 主要功能

1. **付款提醒（新增）**
   - 使用 `usePaymentReminders()` 顯示未來 30 天內到期的收款
   - 自動 5 分鐘刷新
   - 藍色提示框顯示前 3 個提醒
   - 顯示客戶名稱、金額、天數

2. **統計資料（自動刷新）**
   - 使用 `usePaymentStatistics()`
   - 自動每 10 分鐘刷新
   - 顯示本月已收、待收、逾期金額
   - 計算收款率

3. **未收款管理**
   - 使用 `useUnpaidPayments()` 自動 5 分鐘刷新
   - 使用 `useMarkPaymentAsOverdue()` 標記為逾期
   - 按逾期天數排序
   - Toast 反饋

4. **已收款記錄**
   - 使用 `useCollectedPayments()`
   - 按付款日期排序
   - 顯示完整付款資訊

5. **過濾和搜尋**
   - 按付款類型過濾
   - 搜尋客戶名稱和合約編號
   - 前端過濾實時響應

#### 程式碼範例

```tsx
function PaymentsPage() {
  // 自動刷新的資料
  const { data: collectedPayments } = useCollectedPayments()
  const { data: unpaidPayments } = useUnpaidPayments() // 5 分鐘刷新
  const { data: statistics } = usePaymentStatistics() // 10 分鐘刷新
  const { data: reminders } = usePaymentReminders() // 5 分鐘刷新

  // Mutation hooks
  const markAsOverdue = useMarkPaymentAsOverdue()

  const handleMarkOverdue = async (paymentId) => {
    await markAsOverdue.mutateAsync(paymentId)
    toast.success('已標記為逾期')
  }
}
```

## 新增的 Hooks 功能

### useContracts.ts

新增了以下 hooks：

1. **`useUpdateContract(contractId)`**
   ```tsx
   const updateContract = useUpdateContract(contractId)
   await updateContract.mutateAsync({
     status: 'expired',
     notes: '合約已到期'
   })
   ```

2. **`useDeleteContract()`**
   ```tsx
   const deleteContract = useDeleteContract()
   await deleteContract.mutateAsync(contractId)
   // 包含樂觀更新和自動快取失效
   ```

### usePayments.ts

所有 hooks 都已完整整合並正常運作。

## 自動刷新機制

### 合約模組

| Hook | 刷新間隔 | 說明 |
|------|---------|------|
| `useContracts()` | 5 分鐘 stale time | 一般合約列表 |
| `useContractDetail()` | 5 分鐘 / 2 分鐘 | 合約詳情 / 付款進度 |
| `useOverdueContracts()` | **5 分鐘自動刷新** | 逾期合約列表 |
| `useContractProgress()` | 2 分鐘 stale time | 個別合約付款進度 |

### 付款模組

| Hook | 刷新間隔 | 說明 |
|------|---------|------|
| `usePayments()` | 2 分鐘 stale time | 一般付款列表 |
| `useCollectedPayments()` | 5 分鐘 stale time | 已收款記錄 |
| `useUnpaidPayments()` | **5 分鐘自動刷新** | 未收款記錄 |
| `usePaymentStatistics()` | **10 分鐘自動刷新** | 統計資料 |
| `usePaymentReminders()` | **5 分鐘自動刷新** | 付款提醒 |

**說明：**
- **Stale time**: 資料在快取中保持「新鮮」的時間，超過後自動重新取得
- **自動刷新 (refetchInterval)**: 無論資料是否過期，定期強制刷新

## 快取策略

### 快取鍵結構

```typescript
// 合約
['contracts'] // 所有合約列表
['contracts', filters] // 過濾後的合約列表
['contracts', contractId] // 單一合約
['contracts', contractId, 'progress'] // 合約付款進度
['contracts', 'overdue'] // 逾期合約

// 付款
['payments'] // 所有付款
['payments', filters] // 過濾後的付款
['payments', 'collected'] // 已收款
['payments', 'unpaid'] // 未收款
['payments', 'statistics'] // 統計資料
['payments', 'reminders'] // 付款提醒
```

### 快取失效規則

**建立合約時：**
- 使所有 `['contracts']` 失效
- 使 `['quotations']` 失效（報價單已轉為合約）
- 設定新合約的快取 `['contracts', newId]`

**更新合約時：**
- 使所有 `['contracts']` 失效
- 更新單一合約快取
- 使付款進度快取失效

**刪除合約時：**
- 樂觀更新：立即從快取移除
- 成功後使所有合約快取失效
- 失敗時還原快取

**記錄付款時：**
- 使所有 `['payments']` 失效
- 使相關合約的 `['contracts', id]` 和進度快取失效
- 使付款統計快取失效

## 樂觀更新

### 刪除合約

```tsx
export function useDeleteContract() {
  return useMutation({
    mutationFn: deleteContract,
    onMutate: async (contractId) => {
      // 1. 取消進行中的查詢
      await queryClient.cancelQueries({ queryKey: ['contracts'] })

      // 2. 儲存當前狀態
      const previousContracts = queryClient.getQueryData(['contracts'])

      // 3. 樂觀更新：立即從 UI 移除
      queryClient.setQueriesData(['contracts'], (old) =>
        old?.filter(c => c.id !== contractId)
      )

      return { previousContracts }
    },
    onError: (err, contractId, context) => {
      // 4. 如果失敗，還原資料
      queryClient.setQueryData(['contracts'], context.previousContracts)
    }
  })
}
```

## 錯誤處理

### 三層錯誤處理機制

1. **API 層**
   - 檢查 response.ok
   - 解析錯誤訊息
   - 拋出包含詳細訊息的 Error

2. **Hooks 層**
   - React Query 自動捕捉錯誤
   - 提供 `error` 狀態
   - 支援自動重試

3. **UI 層**
   - 顯示載入狀態
   - 顯示錯誤訊息
   - Toast 通知
   - 支援國際化

### 錯誤處理範例

```tsx
function ContractsPage() {
  const { data, isLoading, error } = useContracts()

  if (isLoading) return <LoadingSpinner />

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        {error instanceof Error ? error.message : t('contracts.fetchError')}
      </div>
    )
  }

  // 正常渲染
}

// Mutation 錯誤處理
async function handleDelete(id) {
  try {
    await deleteContract.mutateAsync(id)
    toast.success(t('contracts.deleteSuccess'))
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : t('contracts.deleteError')
    )
  }
}
```

## 使用者反饋

使用 `sonner` toast 系統提供即時反饋：

| 操作 | 反饋 |
|-----|------|
| 更新下次收款成功 | 綠色 Toast |
| 刪除合約成功 | 綠色 Toast |
| 標記為逾期成功 | 綠色 Toast |
| 發送提醒 | 藍色 Info Toast |
| 任何操作失敗 | 紅色 Toast + 錯誤訊息 |
| 資料載入中 | Spinner 動畫 |

## 型別安全

所有 hooks 都有完整的 TypeScript 型別定義：

```typescript
// 從 hooks 匯入型別
import {
  useContracts,
  useContractDetail,
  useUpdateContract,
  useDeleteContract,
  type ContractFilters,
  type UpdateContractParams,
  type CreateContractParams,
} from '@/hooks/useContracts'

import {
  usePayments,
  usePaymentStatistics,
  useCreatePayment,
  type PaymentFilters,
  type CreatePaymentInput,
  type PaymentStatistics,
} from '@/hooks/usePayments'
```

## 國際化支援

### 新增的翻譯鍵

```json
{
  "contracts": {
    "expiringAlert": {
      "title": "即將到期提醒",
      "description": "個合約將在 30 天內到期"
    },
    "confirmDelete": "確定要刪除此合約嗎？",
    "deleteSuccess": "合約已成功刪除",
    "deleteError": "刪除合約失敗",
    "reminderSent": "提醒已發送",
    "nextCollection": {
      "validationError": "請填寫所有必填欄位",
      "updateSuccess": "下次收款資訊已更新",
      "updateError": "更新失敗"
    }
  },
  "payments": {
    "upcomingReminders": "即將到期的收款",
    "daysUntilDue": "天後到期",
    "markedAsOverdue": "已標記為逾期",
    "markOverdueError": "標記失敗",
    "reminderSent": "提醒已發送"
  }
}
```

## 測試檢查清單

### 合約管理

- [x] 列表頁面載入合約資料
- [x] 逾期合約警告自動刷新（5 分鐘）
- [x] 即將到期合約警告顯示
- [x] 過濾功能（全部/進行中/已到期/逾期）
- [x] 搜尋功能
- [x] 刪除合約（含確認對話框）
- [x] 刪除成功的樂觀更新
- [x] 刪除失敗的自動還原
- [x] ContractCard 自動載入付款進度
- [x] 合約詳情頁面顯示完整資訊
- [x] 付款歷史記錄顯示
- [x] 更新下次收款資訊

### 付款管理

- [x] 統計資料顯示並自動刷新（10 分鐘）
- [x] 付款提醒顯示並自動刷新（5 分鐘）
- [x] 未收款列表自動刷新（5 分鐘）
- [x] 標記為逾期功能
- [x] 按付款類型過濾
- [x] 搜尋功能
- [x] 已收款/未收款分欄顯示
- [x] Toast 通知正常運作

### 錯誤處理

- [ ] API 錯誤顯示友善訊息
- [ ] 網路錯誤處理
- [ ] 載入狀態顯示
- [ ] 空狀態顯示

## 效能優化

1. **快取管理**
   - 合理的 stale time 減少不必要的請求
   - 自動快取失效確保資料新鮮

2. **樂觀更新**
   - 刪除操作立即反映在 UI
   - 提升使用者體驗

3. **獨立資料取得**
   - ContractCard 獨立取得自己的付款進度
   - 避免父元件過度渲染

4. **自動刷新**
   - 重要資料（逾期、統計）定期自動刷新
   - 使用者無需手動刷新頁面

## 未來改進建議

1. **批次操作**
   - 批次刪除合約
   - 批次更新狀態

2. **進階過濾**
   - 日期範圍篩選
   - 多條件組合過濾
   - 儲存過濾條件

3. **匯出功能**
   - 匯出合約列表為 CSV/Excel
   - 匯出付款報表

4. **通知系統**
   - Email 提醒
   - 系統內通知
   - 提醒設定

5. **儀表板**
   - 合約概覽儀表板
   - 付款趨勢圖表
   - 收款預測

## 相關文件

- [useContracts Hook 文檔](/hooks/useContracts.ts)
- [usePayments Hook 文檔](/hooks/usePayments.ts)
- [客戶整合文檔](/docs/CUSTOMER_INTEGRATION.md)
- [產品整合文檔](/docs/PRODUCT_INTEGRATION.md)
- [報價單整合文檔](/docs/QUOTATION_INTEGRATION.md)
- [API 整合指南](/docs/API_INTEGRATION_GUIDE.md)

## 總結

合約與付款管理模組已成功整合到新的 API hooks 系統中，提供了：

✅ 完整的 CRUD 操作
✅ 智能的自動刷新機制（逾期提醒 5 分鐘、統計資料 10 分鐘）
✅ 自動快取管理和失效策略
✅ 樂觀更新提升使用者體驗
✅ 友善的錯誤處理和反饋
✅ 完整的國際化支援
✅ TypeScript 型別安全
✅ 付款進度追蹤和歷史記錄
✅ 收款提醒和統計分析

所有功能已準備就緒，可以進行測試和部署。自動刷新機制確保使用者始終看到最新的資料，無需手動刷新頁面。
