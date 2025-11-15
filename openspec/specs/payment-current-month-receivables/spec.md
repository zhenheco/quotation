# payment-current-month-receivables Specification

## Purpose
TBD - created by archiving change enhance-payment-dashboard. Update Purpose after archive.
## Requirements
### Requirement: System SHALL provide current month receivables list

System SHALL display all payment schedules due in the current month with quotation number and schedule information.

#### Scenario: 查看當月應收款項清單
**Given**: 使用者已登入且當月有多筆應收款項
**When**: 使用者開啟收款管理頁面
**Then**: 系統顯示當月應收款項表格，包含以下欄位：
- 勾選框（pending/overdue 狀態）或已收勾號（paid 狀態）
- 報價單編號
- 客戶名稱（依語系顯示中文或英文）
- 期數資訊（如「第 3 期/共 12 期」）
- 金額（含幣別）
- 收款日期
- 狀態標籤（未收/已收/逾期）

#### Scenario: 報價單編號正確關聯
**Given**: payment_schedule 透過 contract_id → customer_contracts.quotation_id 關聯報價單
**When**: 系統查詢當月應收款項
**Then**: 每筆記錄正確顯示對應的報價單編號（quotation_number）
**And**: 如果合約沒有關聯報價單，顯示 "-"

#### Scenario: 期數資訊正確計算
**Given**: payment_schedule 有 schedule_number 欄位
**When**: 系統查詢當月應收款項
**Then**: 每筆記錄顯示「第 N 期/共 M 期」
**And**: M 為該合約的總排程數量（COUNT(*) FROM payment_schedules WHERE contract_id = ...）

### Requirement: System SHALL allow marking receivables as collected

System SHALL provide a checkbox to mark pending or overdue receivables as collected, creating corresponding payment records.

#### Scenario: 標記未收款項為已收
**Given**: 使用者在當月應收清單看到一筆 status = 'pending' 的款項
**When**: 使用者勾選該筆款項的勾選框
**Then**: 系統顯示確認 toast 訊息「已標記為收款」
**And**: 該筆 payment_schedule 狀態更新為 'paid'
**And**: 系統創建對應的 payment 記錄
**And**: payment_schedule.paid_date 更新為當前日期
**And**: payment_schedule.payment_id 更新為創建的 payment.id
**And**: 勾選框變成綠色勾號圖示

#### Scenario: 標記逾期款項為已收
**Given**: 使用者在當月應收清單看到一筆 status = 'overdue' 的款項
**When**: 使用者勾選該筆款項的勾選框
**Then**: 系統執行與「標記未收款項為已收」相同的流程
**And**: 該筆款項狀態從 'overdue' 變成 'paid'

#### Scenario: 已收款項不可重複標記
**Given**: 使用者在當月應收清單看到一筆 status = 'paid' 的款項
**When**: 使用者檢視該筆記錄
**Then**: 該筆記錄顯示綠色勾號圖示而非勾選框
**And**: 無法再次勾選

### Requirement: System SHALL update contract next collection info

System SHALL automatically update customer_contracts.next_collection_date and next_collection_amount after marking a receivable as collected.

#### Scenario: 更新合約下次收款資訊（還有未收期款）
**Given**: 使用者標記某筆 payment_schedule 為已收
**And**: 該合約還有其他 status = 'pending' 的排程
**When**: 系統完成標記收款操作
**Then**: 系統查詢該合約下一筆 pending 排程（按 due_date 排序）
**And**: 更新 customer_contracts.next_collection_date 為下一筆排程的 due_date
**And**: 更新 customer_contracts.next_collection_amount 為下一筆排程的 amount

#### Scenario: 更新合約下次收款資訊（已無未收期款）
**Given**: 使用者標記某筆 payment_schedule 為已收
**And**: 該合約已無其他 status = 'pending' 的排程
**When**: 系統完成標記收款操作
**Then**: 系統將 customer_contracts.next_collection_date 設為 NULL
**And**: 系統將 customer_contracts.next_collection_amount 設為 NULL

### Requirement: System SHALL provide current month summary statistics

System SHALL display summary statistics for current month receivables including total count, pending count, paid count, overdue count, and corresponding amounts.

#### Scenario: 顯示當月應收匯總資料
**Given**: 使用者開啟收款管理頁面
**When**: 系統載入當月應收款項
**Then**: 系統在表格上方顯示匯總資料：
- 總筆數（total_count）
- 未收筆數（pending_count）
- 已收筆數（paid_count）
- 逾期筆數（overdue_count）
- 總金額（total_amount）
- 未收金額（pending_amount）
- 已收金額（paid_amount）
- 逾期金額（overdue_amount）

#### Scenario: 匯總資料即時更新
**Given**: 使用者標記一筆未收款項為已收
**When**: 操作成功完成
**Then**: 匯總資料即時更新：
- pending_count 減 1
- paid_count 加 1
- pending_amount 減去該筆金額
- paid_amount 加上該筆金額

### Requirement: System SHALL calculate overdue status based on due_date

System SHALL mark payment schedules as overdue when due_date < current date and status = 'pending'.

#### Scenario: 自動判斷逾期狀態
**Given**: 系統查詢當月應收款項
**When**: 某筆 payment_schedule 的 due_date < 當前日期且 status = 'pending'
**Then**: 該筆記錄在前端顯示為逾期狀態（紅色標籤）
**And**: is_overdue 欄位為 true
**And**: days_until_due 為負數（表示逾期天數）

#### Scenario: 未逾期款項正確顯示
**Given**: 系統查詢當月應收款項
**When**: 某筆 payment_schedule 的 due_date >= 當前日期且 status = 'pending'
**Then**: 該筆記錄在前端顯示為未收狀態（黃色標籤）
**And**: is_overdue 欄位為 false
**And**: days_until_due 為正數或 0（表示還有幾天到期）

### Requirement: System SHALL support database transaction for mark-collected operation

System SHALL execute mark-collected operation in a database transaction to ensure data consistency.

#### Scenario: Transaction 確保資料一致性
**Given**: 使用者標記某筆 payment_schedule 為已收
**When**: 系統執行以下操作：
1. 創建 payment 記錄
2. 更新 payment_schedule 狀態
3. 更新 customer_contracts 下次收款資訊
**Then**: 所有操作在同一個 transaction 中執行
**And**: 如果任一步驟失敗，所有變更 rollback
**And**: 如果全部成功，transaction commit

#### Scenario: Transaction rollback 錯誤處理
**Given**: 使用者標記某筆 payment_schedule 為已收
**And**: 在創建 payment 記錄後發生資料庫錯誤
**When**: 系統嘗試更新 payment_schedule
**Then**: Transaction 自動 rollback
**And**: payment 記錄未創建
**And**: payment_schedule 狀態保持不變
**And**: 前端顯示錯誤訊息「標記收款失敗，請稍後再試」

### Requirement: System MUST validate user authorization

System MUST verify that the user owns the payment_schedule before allowing any operations.

#### Scenario: 驗證使用者權限
**Given**: 使用者 A 嘗試標記某筆 payment_schedule 為已收
**When**: 系統檢查該 payment_schedule.user_id
**Then**: 如果 user_id === session.user.id，允許操作
**And**: 如果 user_id !== session.user.id，返回 403 錯誤

#### Scenario: 防止未授權存取
**Given**: 使用者 A 嘗試存取 GET /api/payments/current-month-receivables
**When**: 系統執行查詢
**Then**: 查詢條件必須包含 WHERE user_id = session.user.id
**And**: 只返回該使用者的資料

### Requirement: System SHALL optimize query performance with indexes

System SHALL use database indexes to optimize current month receivables query.

#### Scenario: 使用索引優化查詢
**Given**: payment_schedules 表有 idx_payment_schedules_due_date 索引（due_date, status）
**When**: 系統查詢當月應收款項（WHERE due_date >= ? AND due_date < ?）
**Then**: 查詢使用該索引
**And**: 查詢回應時間 < 500ms（資料量 < 1000 筆時）

#### Scenario: JOIN 操作效能優化
**Given**: customer_contracts 表有 idx_customer_contracts_quotation 索引（quotation_id）
**When**: 系統執行 JOIN 查詢關聯報價單編號
**Then**: JOIN 操作使用該索引
**And**: 整體查詢回應時間 < 800ms（包含 3 個 JOIN）

