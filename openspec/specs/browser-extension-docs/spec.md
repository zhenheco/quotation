# browser-extension-docs Specification

## Purpose
TBD - created by archiving change fix-dashboard-errors. Update Purpose after archive.
## Requirements
### Requirement: 瀏覽器擴充套件衝突文件

系統文件 MUST 說明瀏覽器擴充套件可能造成的衝突，並 MUST 提供除錯步驟。

#### Scenario: 開發者遇到 autoinsert.js 錯誤

**Given** 開發者在 Console 看到 `autoinsert.js:1 Uncaught SyntaxError`
**When** 查閱專案文件
**Then** 應找到說明此錯誤來源於瀏覽器擴充套件
**And** 提供無痕模式測試建議

#### Scenario: 使用者回報資源被阻擋

**Given** 使用者回報 `ERR_BLOCKED_BY_CONTENT_BLOCKER`
**When** 查閱除錯文件
**Then** 應找到可能的擴充套件清單
**And** 提供暫時停用擴充套件的步驟

