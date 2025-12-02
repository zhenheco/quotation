## MODIFIED Requirements

### Requirement: Company Settings Page

系統設定頁面 SHALL 整合公司資訊管理和團隊成員管理功能於同一頁面。

頁面結構 SHALL 按以下順序顯示：
1. 我的公司列表（公司卡片）
2. 公司表單（基本資訊、地址、銀行資訊）
3. 團隊成員管理區塊（在檔案上傳區塊之前）
4. 檔案上傳區塊（Logo、簽名、存摺封面）
5. 保存按鈕

#### Scenario: 顯示團隊成員區塊

- **WHEN** 使用者選擇一個公司
- **THEN** 系統 SHALL 在檔案上傳區塊之前顯示「團隊成員」區塊
- **AND** 區塊 SHALL 包含「成員」和「邀請連結」兩個 Tab
- **AND** 預設顯示「成員」Tab

#### Scenario: 成員 Tab 功能

- **WHEN** 使用者在「成員」Tab
- **THEN** 系統 SHALL 顯示該公司所有活躍成員的列表
- **AND** 每位成員 SHALL 顯示頭像、名稱、Email、角色、加入日期
- **AND** 公司擁有者 SHALL 標示為「擁有者」
- **AND** 當前使用者 SHALL 標示為「你」

#### Scenario: 成員資料來源

- **WHEN** 系統載入成員列表
- **THEN** API SHALL 從 `company_members` 表 join `user_profiles` 表取得成員資料
- **AND** 每位成員資料 SHALL 包含 `user_profile` 物件，含 `full_name`、`display_name`、`email`、`avatar_url`
- **AND** 系統 SHALL 不需額外呼叫 profile API 取得使用者資料

#### Scenario: 擁有者管理成員

- **WHEN** 當前使用者是公司擁有者
- **THEN** 使用者 SHALL 可以變更其他成員的角色
- **AND** 使用者 SHALL 可以移除其他成員（非擁有者）
- **AND** 使用者 SHALL 無法移除自己或其他擁有者

#### Scenario: 邀請連結 Tab 功能

- **WHEN** 使用者在「邀請連結」Tab
- **AND** 使用者是公司擁有者或業務經理
- **THEN** 系統 SHALL 顯示邀請連結管理介面
- **AND** 使用者 SHALL 可以建立新的邀請連結
- **AND** 使用者 SHALL 可以設定邀請連結的預設角色

#### Scenario: 新增公司時不顯示團隊成員區塊

- **WHEN** 使用者正在新增公司（尚未保存）
- **THEN** 系統 SHALL 不顯示團隊成員區塊
- **AND** 只有在公司保存後才顯示團隊成員區塊

## REMOVED Requirements

### Requirement: 獨立的團隊管理頁面

**Reason**: 團隊成員管理功能已整合至公司設定頁面

**Migration**:
- `/settings/team` 路由將被移除
- 所有團隊管理功能現在可在 `/settings` 頁面的公司設定表單中使用
- 使用者選擇公司後即可管理該公司的團隊成員
