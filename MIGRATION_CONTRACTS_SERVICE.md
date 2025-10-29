# Contracts Service 遷移至 Supabase Client SDK

## 遷移日期
2025-10-29

## 檔案位置
`/Users/avyshiu/Claudecode/quotation-system/lib/services/contracts.ts`

## 遷移摘要

### 變更內容
1. **移除依賴**
   - 移除 `lib/db/zeabur` 的所有導入
   - 移除直接的 SQL query 調用

2. **改用 Supabase Client SDK**
   - 使用 `createClient()` from `@/lib/supabase/server`
   - 所有資料庫操作改為 Supabase Client 方法

3. **資料庫操作對應**
   - `SELECT` → `.from().select()`
   - `INSERT` → `.insert()`
   - `UPDATE` → `.update()`
   - `DELETE` → `.delete()`
   - `JOIN` → `.select('*, related_table(*)')`
   - 複雜查詢 → `.rpc('function_name')`

### 函式清單 (17 個)

#### Contracts 操作
1. `getContracts()` - 取得合約列表（支援篩選）
2. `getContractById()` - 取得單一合約詳情
3. `createContract()` - 建立新合約
4. `updateContract()` - 更新合約
5. `deleteContract()` - 刪除合約
6. `updateContractFile()` - 更新合約檔案 URL
7. `convertQuotationToContract()` - 將報價單轉為合約

#### Payment Schedules 操作
8. `generatePaymentSchedule()` - 生成付款排程
9. `getPaymentSchedules()` - 取得付款排程列表
10. `getOverduePayments()` - 取得逾期款項
11. `getUpcomingPayments()` - 取得即將到期款項
12. `markScheduleAsPaid()` - 標記排程為已付款

#### Helper Functions
13. `generateContractNumber()` - 生成合約編號 (內部函式)
14. `updateCustomerNextPayment()` - 更新客戶下次付款資訊
15. `updateNextCollection()` - 更新下次應收資訊
16. `getContractPaymentProgress()` - 取得合約付款進度
17. `getContractsWithOverduePayments()` - 取得有逾期付款的合約

### 資料庫 RPC 函式

#### 已存在 (Migration 004)
- `generate_payment_schedules_for_contract()` - 為合約生成付款排程

#### 新建立 (Migration 008)
- `get_payment_schedules_with_details()` - 取得帶詳細資訊的付款排程
- `get_contract_payment_progress()` - 取得合約付款進度
- `get_contracts_with_overdue_payments()` - 取得有逾期付款的合約列表

### 資料庫 Views 使用
- `overdue_payments` - 逾期款項視圖
- `upcoming_payments` - 即將到期款項視圖

### 向後兼容性
- ✅ 所有函式簽名保持不變
- ✅ 所有業務邏輯保持不變
- ✅ 所有權限檢查保持不變
- ✅ 錯誤處理方式一致

### 類型安全
- ✅ 使用 TypeScript 類型
- ✅ 使用 { data, error } 解構
- ✅ 適當的錯誤處理
- ✅ 通過 TypeScript 類型檢查

### 需要注意的事項

1. **views 需存在**
   - `overdue_payments`
   - `upcoming_payments`

2. **RPC 函式需執行**
   - 執行 `migrations/008_contract_service_rpc_functions.sql`

3. **權限設定**
   - 確保 RPC 函式有適當的執行權限
   - 確保 views 有適當的查詢權限

### 測試建議

1. **基本 CRUD 測試**
   ```typescript
   // 建立合約
   const contract = await createContract(userId, contractData);

   // 讀取合約
   const fetched = await getContractById(contract.id, userId);

   // 更新合約
   const updated = await updateContract(contract.id, userId, { status: 'completed' });

   // 刪除合約
   await deleteContract(contract.id, userId);
   ```

2. **付款排程測試**
   ```typescript
   // 生成付款排程
   const schedules = await generatePaymentSchedule(userId, contractId, customerId, params);

   // 取得付款排程
   const list = await getPaymentSchedules(userId, contractId);

   // 標記為已付款
   await markScheduleAsPaid(scheduleId, userId, paymentId, paidDate);
   ```

3. **進階功能測試**
   ```typescript
   // 報價單轉合約
   const result = await convertQuotationToContract(userId, quotationId, contractData);

   // 取得付款進度
   const progress = await getContractPaymentProgress(userId, contractId);

   // 取得逾期合約
   const overdue = await getContractsWithOverduePayments(userId);
   ```

## 執行 Migration

```bash
# 在 Supabase 控制台執行或使用 Supabase CLI
psql -U postgres -d your_database -f migrations/008_contract_service_rpc_functions.sql
```

## 驗證

```bash
# TypeScript 類型檢查
npx tsc --noEmit

# 應該沒有錯誤輸出
```

## 完成狀態
✅ 遷移完成
✅ TypeScript 類型檢查通過
✅ 所有函式保持向後兼容
✅ RPC 函式已建立
