# 客戶管理模組整合文檔

## 概述

客戶管理模組已成功整合到新的 React Query hooks 系統中，提供完整的資料管理、快取、樂觀更新和錯誤處理功能。

## 整合日期

2025-01-25

## 已完成的整合

### 1. CustomerList 元件 (`app/[locale]/customers/CustomerList.tsx`)

#### 變更內容

**之前：**
- 使用 props 接收客戶列表
- 手動處理搜尋過濾
- 手動管理刪除狀態和錯誤處理
- 使用 `fetch` API 直接呼叫

**之後：**
- 使用 `useSearchCustomers(searchTerm)` hook 處理資料和搜尋
- 使用 `useDeleteCustomer()` mutation hook 處理刪除
- 自動處理載入狀態、錯誤狀態和空狀態
- 使用 `toast` 提供用戶反饋
- 實作樂觀更新（刪除時立即從 UI 移除）

#### 主要功能

1. **即時搜尋**
   - 使用者輸入時自動過濾客戶
   - 前端快取搜尋結果，無需重新請求

2. **載入狀態**
   - 顯示 spinner 在資料載入時
   - 優雅的載入動畫

3. **錯誤處理**
   - 顯示友善的錯誤訊息
   - 錯誤訊息支援國際化

4. **刪除功能**
   - 樂觀更新：立即從 UI 移除
   - 如果失敗自動還原
   - 成功/失敗 toast 通知

#### 程式碼範例

```tsx
// 使用 hooks
const { data: customers, isLoading, error } = useSearchCustomers(searchTerm)
const deleteCustomer = useDeleteCustomer()

// 刪除處理
const handleDelete = async () => {
  try {
    await deleteCustomer.mutateAsync(deleteModal.customerId)
    toast.success(t('customer.deleteSuccess'))
  } catch (error) {
    toast.error(error.message)
  }
}
```

### 2. CustomerForm 元件 (`app/[locale]/customers/CustomerForm.tsx`)

#### 變更內容

**之前：**
- 手動管理提交狀態
- 使用 `fetch` API 直接呼叫
- 手動處理錯誤並顯示在 UI
- 需要 `router.refresh()` 刷新資料

**之後：**
- 使用 `useCreateCustomer()` 和 `useUpdateCustomer(id)` hooks
- 自動快取失效和更新
- 使用 `toast` 提供反饋
- 移除了錯誤 state（統一使用 toast）
- 添加前端驗證

#### 主要功能

1. **表單驗證**
   - 檢查必填欄位（中英文名稱、Email）
   - 顯示友善的驗證錯誤訊息

2. **提交狀態**
   - 按鈕在提交時自動 disable
   - 顯示「儲存中...」狀態

3. **成功/錯誤反饋**
   - 使用 toast 顯示成功或錯誤訊息
   - 成功後自動導航回列表頁面

4. **自動快取更新**
   - 建立/更新後自動更新客戶列表
   - 無需手動刷新頁面

#### 程式碼範例

```tsx
// 使用 hooks
const createCustomer = useCreateCustomer()
const updateCustomer = useUpdateCustomer(customer?.id || '')

// 提交處理
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  // 驗證
  if (!formData.nameZh.trim() || !formData.nameEn.trim()) {
    toast.error(t('customer.validation.nameRequired'))
    return
  }

  try {
    if (customer) {
      await updateCustomer.mutateAsync(customerData)
      toast.success(t('customer.updateSuccess'))
    } else {
      await createCustomer.mutateAsync(customerData)
      toast.success(t('customer.createSuccess'))
    }
    router.push(`/${locale}/customers`)
  } catch (err) {
    toast.error(err.message)
  }
}
```

### 3. 客戶列表頁面 (`app/[locale]/customers/page.tsx`)

#### 變更內容

**之前：**
- Server Component
- 在伺服器端取得資料
- 傳遞資料給客戶端元件

**之後：**
- Client Component (`'use client'`)
- 資料在客戶端使用 hooks 取得
- 簡化的頁面結構

#### 優點

1. **更好的使用者體驗**
   - 即時搜尋和過濾
   - 樂觀更新
   - 無需頁面刷新

2. **更簡潔的程式碼**
   - 移除伺服器端邏輯
   - 統一的資料管理方式

### 4. 客戶編輯頁面 (`app/[locale]/customers/[id]/page.tsx`)

#### 變更內容

**之前：**
- Server Component
- 在伺服器端取得客戶資料
- 需要處理錯誤和 notFound

**之後：**
- Client Component
- 使用 `useCustomer(id)` hook 取得資料
- 自動處理載入和錯誤狀態

#### 主要功能

1. **載入狀態**
   - 顯示 spinner 在資料載入時
   - 優雅的載入體驗

2. **錯誤處理**
   - 如果客戶不存在，顯示 404 頁面
   - 自動處理 API 錯誤

3. **資料同步**
   - 編輯後自動更新快取
   - 與列表頁面保持同步

## 新增的國際化鍵

### 中文 (zh.json)

```json
{
  "customer": {
    "createSuccess": "客戶建立成功",
    "updateSuccess": "客戶更新成功",
    "deleteSuccess": "客戶刪除成功",
    "createError": "建立客戶失敗",
    "updateError": "更新客戶失敗",
    "deleteError": "刪除客戶失敗",
    "fetchError": "載入客戶資料失敗",
    "saveError": "儲存客戶失敗",
    "validation": {
      "nameRequired": "請輸入客戶名稱（中文和英文）",
      "emailRequired": "請輸入電子郵件地址"
    }
  }
}
```

### 英文 (en.json)

```json
{
  "customer": {
    "createSuccess": "Customer created successfully",
    "updateSuccess": "Customer updated successfully",
    "deleteSuccess": "Customer deleted successfully",
    "createError": "Failed to create customer",
    "updateError": "Failed to update customer",
    "deleteError": "Failed to delete customer",
    "fetchError": "Failed to load customer data",
    "saveError": "Failed to save customer",
    "validation": {
      "nameRequired": "Please enter customer name (both Chinese and English)",
      "emailRequired": "Please enter email address"
    }
  }
}
```

## 使用的 Hooks

### 來自 `@/hooks/useCustomers.ts`

1. **`useCustomers()`** - 取得所有客戶列表
2. **`useCustomer(id)`** - 取得單一客戶資料
3. **`useSearchCustomers(searchTerm)`** - 搜尋客戶（前端過濾）
4. **`useCreateCustomer()`** - 建立新客戶
5. **`useUpdateCustomer(id)`** - 更新客戶
6. **`useDeleteCustomer()`** - 刪除客戶（含樂觀更新）

## 快取策略

- **Stale Time**: 5 分鐘
- **Cache Key**: `['customers']` 或 `['customers', id]`
- **自動失效**: Mutation 成功後自動更新相關快取
- **樂觀更新**: 刪除操作立即更新 UI，失敗時自動還原

## 錯誤處理

### 三層錯誤處理

1. **React Query 層**
   - 自動重試失敗的請求
   - 快取錯誤狀態

2. **Hooks 層**
   - 拋出有意義的錯誤訊息
   - 包含 API 回傳的詳細錯誤

3. **UI 層**
   - 使用 toast 顯示友善的錯誤訊息
   - 支援國際化
   - 顯示載入和錯誤狀態

### 錯誤範例

```tsx
// API 錯誤
try {
  await createCustomer.mutateAsync(data)
} catch (error) {
  // error.message 包含 API 回傳的錯誤訊息
  toast.error(error.message || t('customer.createError'))
}

// 載入錯誤
if (error) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
      {error instanceof Error ? error.message : t('customer.fetchError')}
    </div>
  )
}
```

## 使用者反饋

使用 `sonner` toast 系統提供即時反饋：

- ✅ 成功：綠色 toast，1-2 秒後自動消失
- ❌ 錯誤：紅色 toast，顯示錯誤訊息
- ⏳ 載入：Spinner 動畫

## 樂觀更新

刪除操作使用樂觀更新：

1. 用戶點擊刪除
2. 立即從 UI 移除項目
3. 發送 API 請求
4. 如果成功：保持移除狀態
5. 如果失敗：還原項目並顯示錯誤

```tsx
// 在 useDeleteCustomer hook 中實作
onMutate: async (id) => {
  // 立即從 UI 移除
  queryClient.setQueryData(['customers'], (old) =>
    old?.filter((c) => c.id !== id) ?? []
  )
  return { previousCustomers }
},
onError: (err, id, context) => {
  // 如果失敗，還原資料
  queryClient.setQueryData(['customers'], context.previousCustomers)
}
```

## 型別安全

所有 hooks 都有完整的 TypeScript 型別定義：

```tsx
import {
  useCustomers,
  useCustomer,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useSearchCustomers,
  type Customer,
  type CreateCustomerInput,
  type UpdateCustomerInput,
} from '@/hooks/useCustomers'
```

## 測試建議

### 功能測試

1. **列表頁面**
   - [ ] 載入時顯示 spinner
   - [ ] 成功載入顯示客戶列表
   - [ ] 錯誤時顯示錯誤訊息
   - [ ] 空狀態顯示正確
   - [ ] 搜尋功能正常運作
   - [ ] 列表/卡片視圖切換

2. **建立客戶**
   - [ ] 表單驗證正常
   - [ ] 成功建立並顯示 toast
   - [ ] 失敗顯示錯誤訊息
   - [ ] 建立後列表自動更新
   - [ ] 自動導航回列表頁面

3. **編輯客戶**
   - [ ] 載入客戶資料
   - [ ] 表單預填資料正確
   - [ ] 成功更新並顯示 toast
   - [ ] 失敗顯示錯誤訊息
   - [ ] 更新後列表自動同步

4. **刪除客戶**
   - [ ] 顯示確認對話框
   - [ ] 樂觀更新（立即移除）
   - [ ] 成功刪除顯示 toast
   - [ ] 失敗時還原並顯示錯誤
   - [ ] 刪除按鈕在處理中 disable

### 錯誤處理測試

1. **網路錯誤**
   - [ ] 斷網時顯示錯誤訊息
   - [ ] React Query 自動重試

2. **API 錯誤**
   - [ ] 400 錯誤顯示驗證訊息
   - [ ] 401 錯誤重導向登入
   - [ ] 500 錯誤顯示友善訊息

3. **驗證錯誤**
   - [ ] 必填欄位驗證
   - [ ] Email 格式驗證

## 效能優化

1. **快取管理**
   - 5 分鐘 stale time 減少不必要的請求
   - 自動快取失效確保資料新鮮

2. **樂觀更新**
   - 刪除操作立即反映在 UI
   - 提升使用者體驗

3. **前端搜尋**
   - 搜尋使用快取資料
   - 無需額外 API 請求

## 未來改進

1. **批次操作**
   - 批次刪除客戶
   - 批次匯出

2. **進階搜尋**
   - 伺服器端搜尋（大量資料時）
   - 多條件篩選

3. **分頁**
   - 無限捲動
   - 傳統分頁

4. **匯入/匯出**
   - CSV 匯入
   - Excel 匯出

## 相關文件

- [Hooks 使用指南](/hooks/README.md)
- [API 整合範例](/docs/API_INTEGRATION_EXAMPLES.md)
- [前端整合指南](/docs/FRONTEND_INTEGRATION_GUIDE.md)

## 總結

客戶管理模組已成功整合到新的 API hooks 系統中，提供了：

✅ 完整的 CRUD 操作
✅ 自動快取管理
✅ 樂觀更新
✅ 友善的錯誤處理
✅ 國際化支援
✅ 型別安全
✅ 優秀的使用者體驗

所有功能已準備就緒，可以進行測試和部署。
