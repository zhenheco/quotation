# Payment Terms Capability Specification

## ADDED Requirements

### Requirement: 付款條款資料結構
系統 MUST 支援在報價單中定義靈活的付款條款，包括分期數量、每期百分比、金額、到期日和付款狀態。

#### Scenario: 建立報價單時新增付款條款
**Given** 用戶正在建立新的報價單
**And** 報價單總金額為 TWD 105,000
**When** 用戶新增付款條款
**And** 設定第1期為 30%，到期日為 2025-12-01
**And** 設定第2期為 50%，到期日為 2026-03-01
**And** 設定第3期為 20%，到期日為 2026-06-01
**Then** 系統自動計算第1期金額為 TWD 31,500
**And** 系統自動計算第2期金額為 TWD 52,500
**And** 系統自動計算第3期金額為 TWD 21,000
**And** 所有期數的付款狀態預設為 "unpaid"

#### Scenario: 百分比總和不等於 100% 時的警告
**Given** 用戶正在編輯付款條款
**When** 用戶設定第1期為 30%
**And** 設定第2期為 50%
**Then** 系統顯示黃色警告「付款百分比總和為 80%，未達 100%」
**And** 系統仍允許儲存此設定

### Requirement: 付款條款 CRUD 操作
系統 MUST 提供完整的付款條款管理功能，包括建立、讀取、更新和刪除。

#### Scenario: 透過 API 建立付款條款
**Given** 報價單 ID 為 "quot-123" 已存在
**And** 報價單總金額為 TWD 100,000
**When** 發送 POST 請求到 `/api/quotations/quot-123/payment-terms`
**And** 請求 body 包含：
```json
{
  "term_number": 1,
  "percentage": 30,
  "due_date": "2025-12-01",
  "description": { "zh": "訂金", "en": "Deposit" }
}
```
**Then** 系統回應 201 Created
**And** 回應包含完整的付款條款資料，包含自動計算的金額 30,000

#### Scenario: 更新付款條款的百分比
**Given** 付款條款 ID 為 "term-456" 已存在
**And** 原始百分比為 30%，金額為 30,000
**When** 發送 PUT 請求更新百分比為 40%
**Then** 系統自動重新計算金額為 40,000
**And** 系統回應 200 OK

#### Scenario: 刪除付款條款
**Given** 付款條款 ID 為 "term-789" 已存在
**And** 該付款條款的付款狀態為 "unpaid"
**When** 發送 DELETE 請求到 `/api/quotations/quot-123/payment-terms/term-789`
**Then** 系統回應 204 No Content
**And** 該付款條款從資料庫中刪除

### Requirement: 報價單總額變更時自動重算
當報價單總金額變更時，系統 MUST 自動重新計算所有付款條款的金額，以保持與百分比的一致性。

#### Scenario: 報價單總額變更觸發重算
**Given** 報價單 ID 為 "quot-123"
**And** 原始總金額為 TWD 100,000
**And** 有3個付款條款：30% (30,000)、50% (50,000)、20% (20,000)
**When** 用戶修改報價單總金額為 TWD 120,000
**Then** 系統自動重新計算第1期金額為 36,000
**And** 系統自動重新計算第2期金額為 60,000
**And** 系統自動重新計算第3期金額為 24,000

### Requirement: 付款狀態追蹤
系統 MUST 支援記錄和更新每期付款的狀態，包括未付款、部分付款、已付款和逾期。

#### Scenario: 更新付款狀態為已付款
**Given** 付款條款 ID 為 "term-456"
**And** 應付金額為 TWD 30,000
**And** 當前付款狀態為 "unpaid"
**When** 財務人員標記此期為已付款
**And** 記錄實際付款金額為 TWD 30,000
**And** 記錄實際付款日期為 2025-12-05
**Then** 系統更新付款狀態為 "paid"
**And** 儲存實際付款資訊

#### Scenario: 逾期自動判斷
**Given** 付款條款 ID 為 "term-789"
**And** 到期日為 2025-11-01
**And** 付款狀態為 "unpaid"
**And** 今天是 2025-11-15
**When** 系統檢查付款狀態
**Then** 系統自動將狀態更新為 "overdue"

#### Scenario: 部分付款狀態
**Given** 付款條款 ID 為 "term-101"
**And** 應付金額為 TWD 50,000
**And** 當前付款狀態為 "unpaid"
**When** 財務人員記錄部分付款 TWD 20,000
**Then** 系統更新付款狀態為 "partial"
**And** 系統記錄已付金額為 20,000

### Requirement: 前端 UI 組件
系統 MUST 提供直觀的 UI 組件來編輯和顯示付款條款。

#### Scenario: 新增付款期數
**Given** 用戶正在編輯報價單
**And** 當前有2個付款期數
**When** 用戶點擊「新增期數」按鈕
**Then** 系統新增第3期的空白表單行
**And** 期數自動設定為 3
**And** 百分比預設為 0

#### Scenario: 使用快速模板
**Given** 用戶正在建立付款條款
**When** 用戶選擇「30%-70%」快速模板
**Then** 系統自動建立2個期數
**And** 第1期百分比為 30%
**And** 第2期百分比為 70%
**And** 系統自動計算對應金額

#### Scenario: 拖曳排序期數
**Given** 有3個付款期數（1、2、3）
**When** 用戶將第3期拖曳到第1期位置
**Then** 期數順序更新為：原第3期→第1期，原第1期→第2期，原第2期→第3期
**And** 系統更新各期的 term_number

### Requirement: PDF 報價單包含付款條款
生成的 PDF 報價單 MUST 包含付款條款資訊，並以表格形式清楚呈現。

#### Scenario: PDF 包含付款條款表格
**Given** 報價單有3個付款期數
**When** 用戶生成 PDF 報價單
**Then** PDF 在總計之後包含「付款條款」區塊
**And** 顯示表格包含欄位：期數、百分比、金額、到期日
**And** 表格支援中英文雙語顯示

### Requirement: 權限控制
系統 MUST 確保只有授權用戶可以編輯付款條款和更新付款狀態。

#### Scenario: 業務人員編輯付款條款
**Given** 用戶角色為「業務人員」
**And** 用戶是報價單的建立者
**When** 用戶嘗試編輯付款條款
**Then** 系統允許編輯操作

#### Scenario: 財務人員更新付款狀態
**Given** 用戶角色為「財務人員」
**When** 用戶嘗試更新付款狀態為「已付款」
**Then** 系統允許更新操作
**And** 記錄操作者和時間戳記

#### Scenario: 未授權用戶無法編輯
**Given** 用戶角色為「訪客」
**When** 用戶嘗試編輯付款條款
**Then** 系統回應 403 Forbidden
**And** 顯示錯誤訊息「您沒有權限執行此操作」

## MODIFIED Requirements

### Requirement: 報價單資料結構擴展
報價單資料結構 MUST 包含與付款條款的關聯。

#### Scenario: 查詢報價單時包含付款條款
**Given** 報價單 ID 為 "quot-123"
**When** 發送 GET 請求到 `/api/quotations/quot-123`
**Then** 回應包含 `payment_terms` 陣列
**And** 陣列包含所有相關的付款條款資料
