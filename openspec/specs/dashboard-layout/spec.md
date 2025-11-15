# dashboard-layout Specification

## Purpose
TBD - created by archiving change move-quickstart-to-top. Update Purpose after archive.
## Requirements
### Requirement: Dashboard MUST provide dual quick actions zones

Dashboard MUST provide quick actions in two zones: compact top zone with 2-3 core actions, and complete bottom zone with all 6 actions.

此設計 MUST 平衡「快速存取」和「資訊優先」原則，符合業界最佳實踐和 UX 研究結果。

#### Scenario: 使用者進入儀表板時立即看到核心快速操作

**Given** 使用者已登入系統
**And** 使用者導航到儀表板頁面
**When** 頁面載入完成
**Then** 頂部精簡快速建立區 MUST 顯示在頁面標題下方
**And** 精簡區 MUST 包含最多 3 個核心建立操作按鈕
**And** 精簡區 MUST 在提醒與警告區之前
**And** 精簡區 MUST 在統計卡片之前
**And** 精簡區高度 MUST NOT 超過螢幕高度的 30%（移動端）
**And** 使用者 MUST 無需滾動即可看到精簡區所有按鈕

#### Scenario: 頂部精簡區只包含核心建立操作

**Given** 頂部精簡快速建立區已實施
**When** 使用者查看頂部精簡區
**Then** 精簡區 MUST 只包含以下 3 個核心建立操作：
1. 建立報價單（主要 CTA，使用 solid 樣式）
2. 新增客戶（次要操作，使用 outline 樣式）
3. 新增產品（次要操作，使用 outline 樣式）
**And** 按鈕 MUST 使用單行橫向布局（flex row）
**And** 主要 CTA MUST 使用藍色背景（bg-blue-600）突出顯示
**And** 次要操作 MUST 使用灰色邊框（border-gray-300）
**And** 所有按鈕 MUST 有 hover 效果
**And** 響應式：移動端 MUST 調整為單列或 2 列布局

#### Scenario: 底部完整區保留所有功能

**Given** 方案 B 已實施
**When** 使用者滾動到頁面底部（圖表區域之後）
**Then** 完整快速操作區 MUST 包含所有 6 個操作：
- 建立報價單
- 新增客戶
- 新增產品
- 管理合約
- 收款記錄
- 報價單列表
**And** 每個按鈕的圖示、標題、描述 MUST 保持不變
**And** 所有連結路徑 MUST 正常運作
**And** 響應式布局 MUST 維持（1 列於小螢幕，2 列於中螢幕，3 列於大螢幕）

#### Scenario: 儀表板整體布局順序（方案 B）

**Given** 方案 B 已實施
**When** 使用者查看完整儀表板
**Then** 頁面元素 MUST 按以下順序排列：
1. 頁面標題與日期
2. **頂部精簡快速建立區**（新增，包含 3 個核心操作）
3. 提醒與警告區（逾期合約、即將到期的付款）
4. 主要統計卡片（本月營收、本月報價單、轉換率、待處理）
5. 業務統計卡片（活躍合約、本月收款、未收款、客戶總數）
6. 圖表區域（營收趨勢、貨幣分布、狀態統計）
7. **底部完整快速操作區**（保留，包含所有 6 個操作）
**And** 所有原有功能 MUST 正常運作
**And** 載入狀態與錯誤處理 MUST 保持不變
**And** 關鍵統計資訊 MUST 優先於快速操作（符合 3 秒規則）

