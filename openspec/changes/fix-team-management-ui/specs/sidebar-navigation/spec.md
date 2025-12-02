# 側邊欄導航

## MODIFIED Requirements

### Requirement: 選單項目高亮邏輯

系統 SHALL 根據當前路徑正確高亮對應的選單項目。

#### Scenario: 團隊管理頁面高亮

**Given** 使用者位於 `/zh/settings/team` 頁面
**When** 側邊欄渲染
**Then** 只有「團隊管理」選單項目應顯示為 active 狀態
**And** 「系統設定」不應顯示為 active 狀態

#### Scenario: 系統設定頁面高亮

**Given** 使用者位於 `/zh/settings` 頁面
**When** 側邊欄渲染
**Then** 只有「系統設定」選單項目應顯示為 active 狀態
**And** 「團隊管理」不應顯示為 active 狀態

### Requirement: 精確匹配規則

對於存在子路徑關係的選單項目（如 `/settings` 和 `/settings/team`），系統 MUST 使用精確匹配或排除邏輯來避免誤判。

#### Scenario: 避免路徑前綴誤判

**Given** 選單包含以下項目：
  - 系統設定: `/settings`
  - 團隊管理: `/settings/team`
**When** 判斷 active 狀態
**Then** 應使用以下邏輯之一：
  - `/settings` 使用精確匹配（`pathname === href`）
  - `/settings` 排除 `/settings/team`（`pathname.startsWith(href) && !pathname.startsWith('/settings/team')`）
