# payment-dashboard-ui Specification

## Purpose
優化收款管理儀表板 UI，移除收款率卡片、新增當月應收總額卡片，並在已收款/未收款區域增加報價單編號和期數資訊。

## MODIFIED Requirements

### Requirement: System SHALL display updated statistics cards

System SHALL replace collection rate card with current month total receivable card.

#### Scenario: 顯示優化後的統計卡片
**Given**: 使用者開啟收款管理頁面
**When**: 統計資料載入完成
**Then**: 系統顯示 4 張統計卡片：
1. 當月已收（綠色）：顯示 current_month.total_collected
2. 當月未收（黃色）：顯示 current_month.total_pending
3. 當月逾期（紅色）：顯示 current_month.total_overdue
4. 當月應收總額（藍色）：顯示 current_month.total_pending + current_month.total_overdue

#### Scenario: 移除收款率卡片
**Given**: 舊版收款管理頁面有收款率卡片
**When**: 使用者開啟新版收款管理頁面
**Then**: 系統不顯示收款率卡片
**And**: 卡片區域仍保持 4 張卡片的網格布局

### Requirement: System SHALL enhance payment cards with quotation and schedule info

System SHALL display quotation number and schedule information in UnpaidPaymentCard and CollectedPaymentCard components.

#### Scenario: 未收款卡片顯示報價單編號
**Given**: 某筆未收款項有關聯報價單
**When**: 系統渲染 UnpaidPaymentCard
**Then**: 卡片顯示報價單編號欄位（如「報價單：Q-2025-001」）
**And**: 如果沒有關聯報價單，顯示「報價單：-」

#### Scenario: 未收款卡片顯示期數資訊
**Given**: 某筆未收款項是分期付款
**When**: 系統渲染 UnpaidPaymentCard
**Then**: 卡片顯示期數資訊（如「期數：第 3 期/共 12 期」）
**And**: 如果沒有期數資訊（全額付款），不顯示此欄位

#### Scenario: 已收款卡片顯示報價單編號和期數
**Given**: 某筆已收款項有報價單編號和期數資訊
**When**: 系統渲染 CollectedPaymentCard
**Then**: 卡片顯示報價單編號和期數資訊
**And**: 欄位樣式與未收款卡片一致

### Requirement: System SHALL display current month receivables table

System SHALL render a table component for current month receivables between statistics cards and unpaid/collected areas.

#### Scenario: 渲染當月應收款項表格
**Given**: 使用者開啟收款管理頁面
**When**: 頁面載入完成
**Then**: 系統在統計卡片下方、已收款/未收款區域上方顯示「當月應收款項」表格
**And**: 表格包含標題區和資料區
**And**: 標題區顯示匯總資訊（共 X 筆，未收 Y 筆，已收 Z 筆，逾期 W 筆）

#### Scenario: 表格欄位正確顯示
**Given**: 當月應收款項表格渲染
**When**: 使用者查看表格
**Then**: 表格包含以下欄位：
- ✓（勾選框或勾號）
- 報價單編號
- 客戶名稱
- 期數
- 金額
- 收款日期
- 狀態

#### Scenario: 響應式設計（桌面版）
**Given**: 使用者在桌面瀏覽器開啟收款管理頁面
**When**: 視窗寬度 >= 768px
**Then**: 當月應收款項表格以表格形式顯示
**And**: 所有欄位橫向排列

#### Scenario: 響應式設計（手機版）
**Given**: 使用者在手機瀏覽器開啟收款管理頁面
**When**: 視窗寬度 < 768px
**Then**: 當月應收款項表格改以卡片式布局顯示
**And**: 每筆記錄為一張卡片
**And**: 欄位縱向排列

### Requirement: System SHALL provide checkbox interaction for marking collected

System SHALL render clickable checkboxes for pending/overdue receivables and non-clickable checkmarks for paid receivables.

#### Scenario: 未收款項顯示可勾選的勾選框
**Given**: 當月應收清單中有一筆 status = 'pending' 的款項
**When**: 系統渲染該筆記錄
**Then**: ✓ 欄位顯示可勾選的 checkbox
**And**: checkbox 為未勾選狀態
**And**: hover 時顯示可點擊效果

#### Scenario: 逾期款項顯示可勾選的勾選框
**Given**: 當月應收清單中有一筆 status = 'overdue' 的款項
**When**: 系統渲染該筆記錄
**Then**: ✓ 欄位顯示可勾選的 checkbox（與未收款項樣式相同）

#### Scenario: 已收款項顯示不可勾選的勾號
**Given**: 當月應收清單中有一筆 status = 'paid' 的款項
**When**: 系統渲染該筆記錄
**Then**: ✓ 欄位顯示綠色勾號圖示（✓）
**And**: 不顯示 checkbox
**And**: 不可點擊

#### Scenario: 勾選後樂觀更新 UI
**Given**: 使用者勾選一筆未收款項的 checkbox
**When**: 點擊事件觸發
**Then**: checkbox 立即變成綠色勾號（樂觀更新）
**And**: 狀態標籤立即變成「已收」
**And**: 如果 API 請求失敗，UI 回復到原始狀態

### Requirement: System SHALL display status badges with appropriate colors

System SHALL render status badges with color coding: pending (yellow), paid (green), overdue (red).

#### Scenario: 未收款項顯示黃色標籤
**Given**: 某筆款項 status = 'pending'
**When**: 系統渲染狀態標籤
**Then**: 標籤顯示「未收」
**And**: 背景色為黃色（bg-yellow-100）
**And**: 文字色為深黃色（text-yellow-800）

#### Scenario: 已收款項顯示綠色標籤
**Given**: 某筆款項 status = 'paid'
**When**: 系統渲染狀態標籤
**Then**: 標籤顯示「已收」
**And**: 背景色為綠色（bg-green-100）
**And**: 文字色為深綠色（text-green-800）

#### Scenario: 逾期款項顯示紅色標籤
**Given**: 某筆款項 status = 'overdue' 或 is_overdue = true
**When**: 系統渲染狀態標籤
**Then**: 標籤顯示「逾期」
**And**: 背景色為紅色（bg-red-100）
**And**: 文字色為深紅色（text-red-800）

### Requirement: System SHALL sort receivables by due date

System SHALL display current month receivables sorted by due_date in ascending order (earliest first).

#### Scenario: 按收款日期排序
**Given**: 當月應收清單有多筆款項
**When**: 系統渲染表格
**Then**: 款項按 due_date 升序排列
**And**: 最快到期的款項顯示在最上方
**And**: 逾期款項（due_date < today）顯示在最前面

#### Scenario: 相同 due_date 按 schedule_number 排序
**Given**: 多筆款項有相同的 due_date
**When**: 系統渲染表格
**Then**: 這些款項按 schedule_number 升序排列
**And**: 第 1 期顯示在第 2 期之前

### Requirement: System SHALL provide loading and error states

System SHALL display loading spinner during data fetch and error message on fetch failure.

#### Scenario: 載入狀態顯示
**Given**: 使用者開啟收款管理頁面
**When**: 當月應收資料尚未載入完成
**Then**: 表格區域顯示 LoadingSpinner 組件
**And**: 統計卡片顯示骨架屏或 loading 狀態

#### Scenario: 錯誤狀態顯示
**Given**: API 請求失敗（如網路錯誤）
**When**: 系統嘗試載入當月應收資料
**Then**: 表格區域顯示錯誤訊息
**And**: 提供「重試」按鈕
**And**: 點擊重試按鈕重新發送 API 請求

#### Scenario: 空狀態顯示
**Given**: 當月沒有任何應收款項
**When**: API 返回空陣列
**Then**: 表格顯示 EmptyState 組件
**And**: 訊息為「本月沒有應收款項」
**And**: 圖示為 💰

### Requirement: System SHALL display toast notifications for user actions

System SHALL show toast notifications for successful and failed mark-collected operations.

#### Scenario: 標記收款成功顯示 toast
**Given**: 使用者勾選一筆款項的 checkbox
**When**: API 請求成功完成
**Then**: 系統顯示綠色 toast 訊息「已標記為收款」
**And**: toast 自動在 3 秒後消失

#### Scenario: 標記收款失敗顯示 toast
**Given**: 使用者勾選一筆款項的 checkbox
**When**: API 請求失敗（如 400/404/500 錯誤）
**Then**: 系統顯示紅色 toast 訊息
**And**: 錯誤訊息根據 HTTP status code 顯示：
- 400: 「此款項已經收款」
- 404: 「找不到此款項」
- 500: 「標記收款失敗,請稍後再試」

### Requirement: System SHALL follow accessibility best practices

System SHALL implement ARIA labels, keyboard navigation, and screen reader support.

#### Scenario: Checkbox 可鍵盤操作
**Given**: 使用者使用鍵盤導航
**When**: 使用 Tab 鍵移動焦點到 checkbox
**Then**: checkbox 獲得焦點並顯示 focus ring
**And**: 按下 Space 或 Enter 鍵可勾選/取消勾選

#### Scenario: 表格提供 ARIA 標籤
**Given**: 螢幕閱讀器使用者開啟收款管理頁面
**When**: 閱讀器讀取當月應收表格
**Then**: 表格有 `role="table"` 屬性
**And**: 標題列有 `role="rowheader"` 屬性
**And**: 每個欄位有適當的 `aria-label`

#### Scenario: 狀態標籤提供可讀文字
**Given**: 螢幕閱讀器讀取狀態標籤
**When**: 讀取器遇到狀態欄位
**Then**: 讀取器讀出「狀態：未收」或「狀態：已收」或「狀態：逾期」
**And**: 不僅依賴顏色傳達資訊
