# user-onboarding Specification

## Purpose
提供新用戶引導流程，協助用戶建立公司或加入現有公司。

## ADDED Requirements

### Requirement: System SHALL redirect new users to onboarding page

System SHALL redirect users without any company membership to the onboarding page after OAuth login.

#### Scenario: 新用戶首次登入
**Given**: 用戶透過 OAuth 完成登入
**And**: 用戶在 company_members 表中沒有任何記錄
**When**: OAuth callback 處理完成
**Then**: 系統重導向用戶至 `/{locale}/onboarding`

#### Scenario: 既有用戶登入
**Given**: 用戶透過 OAuth 完成登入
**And**: 用戶在 company_members 表中有至少一筆記錄
**When**: OAuth callback 處理完成
**Then**: 系統重導向用戶至 `/{locale}/dashboard`

### Requirement: System SHALL preserve invite code during login flow

System SHALL preserve the invite code when a user clicks an invitation link and needs to login first.

#### Scenario: 未登入用戶點擊邀請連結
**Given**: 用戶點擊邀請連結 `/invite/{code}`
**And**: 用戶尚未登入
**When**: 邀請頁面載入
**Then**: 系統將邀請碼儲存至 localStorage
**And**: 系統重導向用戶至 `/login?redirect=/invite/{code}`

#### Scenario: 邀請用戶完成登入
**Given**: 用戶從邀請連結登入
**And**: URL 包含 `redirect=/invite/{code}` 參數
**When**: OAuth callback 處理完成
**Then**: 系統重導向用戶至 `/invite/{code}`
**And**: 忽略 company_members 檢查

### Requirement: System SHALL provide onboarding welcome page with options

System SHALL display a welcome page with two options: create a new company or join an existing company with an invite code.

#### Scenario: 顯示歡迎頁面
**Given**: 用戶已登入
**And**: 用戶存取 `/onboarding`
**When**: 頁面載入完成
**Then**: 顯示歡迎訊息
**And**: 顯示「建立新公司」按鈕
**And**: 顯示「我有邀請碼」按鈕
**And**: 顯示提示文字：「如果收到同事的邀請連結，請選擇『我有邀請碼』」

#### Scenario: 未登入用戶存取 onboarding
**Given**: 用戶尚未登入
**When**: 用戶存取 `/onboarding`
**Then**: 系統重導向用戶至登入頁面

### Requirement: System SHALL allow creating company from onboarding

System SHALL allow users to create a new company from the onboarding flow, automatically setting them as company owner.

#### Scenario: 建立公司成功
**Given**: 用戶在 onboarding 建立公司頁面
**And**: 用戶填寫公司名稱（必填）
**When**: 用戶提交表單
**Then**: 系統建立 companies 記錄
**And**: 系統建立 company_members 記錄（role = company_owner）
**And**: 系統重導向用戶至 Dashboard

#### Scenario: 公司名稱為空
**Given**: 用戶在 onboarding 建立公司頁面
**And**: 公司名稱欄位為空
**When**: 用戶嘗試提交表單
**Then**: 顯示錯誤訊息「公司名稱為必填欄位」
**And**: 表單不提交

### Requirement: System SHALL allow joining company via invite code from onboarding

System SHALL allow users to join an existing company by entering a valid invite code in the onboarding flow.

#### Scenario: 輸入有效邀請碼
**Given**: 用戶在 onboarding 加入公司頁面
**And**: 用戶輸入有效的邀請碼
**When**: 用戶點擊驗證
**Then**: 顯示公司名稱
**And**: 顯示將被分配的角色
**And**: 顯示「確認加入」按鈕

#### Scenario: 確認加入公司
**Given**: 用戶已驗證邀請碼
**And**: 顯示公司資訊
**When**: 用戶點擊「確認加入」
**Then**: 系統建立 company_members 記錄
**And**: 系統重導向用戶至 Dashboard

#### Scenario: 輸入無效邀請碼
**Given**: 用戶在 onboarding 加入公司頁面
**And**: 用戶輸入無效或已過期的邀請碼
**When**: 用戶點擊驗證
**Then**: 顯示錯誤訊息「邀請碼無效或已過期」

### Requirement: System SHALL support multi-company membership

System SHALL allow users to belong to multiple companies simultaneously and switch between them using the company selector.

#### Scenario: 已有公司的用戶接受邀請
**Given**: 用戶已屬於公司 A
**And**: 用戶收到公司 B 的邀請
**When**: 用戶接受邀請
**Then**: 用戶同時屬於公司 A 和公司 B
**And**: 公司切換器顯示兩個公司

#### Scenario: 不同公司的角色獨立
**Given**: 用戶在公司 A 是 company_owner
**And**: 用戶在公司 B 是 salesperson（透過邀請加入）
**When**: 用戶切換到公司 B
**Then**: 用戶的權限按照 salesperson 角色計算
**And**: 不受公司 A 的 company_owner 角色影響

### Requirement: System SHALL display team settings in sidebar navigation

System SHALL display a team settings link in the sidebar for users who belong to at least one company.

#### Scenario: 顯示團隊設定連結
**Given**: 用戶已登入
**And**: 用戶至少屬於一個公司
**When**: 側邊欄渲染
**Then**: 顯示「團隊管理」連結
**And**: 連結指向 `/settings/team`
