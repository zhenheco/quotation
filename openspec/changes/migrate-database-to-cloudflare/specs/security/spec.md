# security Spec Deltas

## ADDED Requirements

### Requirement: Git 歷史清理

所有洩漏的敏感資料 MUST 從 Git 歷史中完全移除。

#### Scenario: 檢查 Git 歷史
```gherkin
Given Git repository 可能包含敏感資料
When 執行搜尋命令
Then 使用 git log -p -S "敏感字串"
And 確認是否存在洩漏
```

#### Scenario: 移除敏感檔案
```gherkin
Given Git 歷史包含敏感檔案
When 執行清理
Then 使用 BFG Repo-Cleaner 或 git filter-branch
And 移除所有包含敏感資料的 commits
And 執行 git gc --prune=now --aggressive
And 強制推送 git push --force
```

#### Scenario: 撤銷洩漏的密鑰
```gherkin
Given 密鑰已洩漏在 Git 歷史
When 發現洩漏
Then 立即撤銷該密鑰（Zeabur API Token）
And 變更相關密碼（資料庫密碼）
And 產生新的密鑰
```

---

### Requirement: 環境變數管理

所有敏感資料 MUST 使用環境變數，不得硬編碼。

#### Scenario: 移除硬編碼密鑰
```gherkin
Given 程式碼中存在硬編碼密鑰
When 清理程式碼
Then 移除所有硬編碼字串
And 改用 process.env.VAR_NAME
And 更新 .env.example 提供範本
```

#### Scenario: 使用 Cloudflare Secrets
```gherkin
Given Workers 需要敏感資料
When 配置環境變數
Then 使用 wrangler secret put VAR_NAME
And 密鑰儲存在 Cloudflare 加密存儲
And 不出現在 wrangler.jsonc
```

#### Scenario: 本地開發使用 .env.local
```gherkin
Given 本地開發需要環境變數
When 設定開發環境
Then 建立 .env.local 檔案
And 加入 .gitignore
And 提供 .env.example 作為範本
```

---

### Requirement: 應用層權限檢查

權限驗證 MUST 在應用層執行，取代資料庫 RLS。

#### Scenario: API 路由權限檢查
```gherkin
Given 使用者請求 API
When 處理請求
Then 從 JWT 取得 userId
And 呼叫 getUserPermissions(userId)（使用 KV 快取）
If 缺少所需權限
  Then 回傳 403 Forbidden
  And 記錄 audit log
Else
  Then 允許繼續執行
```

#### Scenario: DAL 層強制 user_id 過濾
```gherkin
Given DAL 函式查詢使用者資料
When 執行 SQL 查詢
Then 自動加入 WHERE user_id = ?
And TypeScript 型別強制傳入 userId 參數
And 確保使用者只能存取自己的資料
```

#### Scenario: 跨使用者操作需明確授權
```gherkin
Given 管理員需要查看所有使用者資料
When 呼叫 DAL 函式
Then 提供 adminGetAll() 等特殊函式
And 在 API 路由檢查 'admin' 角色
And 一般使用者呼叫會被拒絕
```

---

### Requirement: 審計日誌

敏感操作 MUST 記錄審計日誌。

#### Scenario: 記錄權限變更
```gherkin
Given 管理員變更使用者角色
When 執行 updateUserRole()
Then 寫入 audit_logs 表
And 記錄：操作者、目標使用者、變更內容、時間戳、IP 位址
```

#### Scenario: 記錄登入嘗試
```gherkin
Given 使用者嘗試登入
When 認證完成（成功或失敗）
Then 寫入 audit_logs
And 記錄：使用者、結果、時間、IP、User-Agent
```

#### Scenario: 記錄資料刪除
```gherkin
Given 使用者刪除重要資料（客戶、報價單）
When 執行刪除操作
Then 寫入 audit_logs
And 記錄：操作者、資料類型、資料 ID、時間
```

---

## REMOVED Requirements

### Requirement: Zeabur 連接配置

**原因**: 完全移除 Zeabur 依賴。

**遷移策略**:
- 刪除所有 Zeabur 相關環境變數
- 移除 lib/db/zeabur.ts
- 刪除 scripts/setup-zeabur-*.sh
- 歸檔 Zeabur 文檔到 docs/archive/zeabur/
