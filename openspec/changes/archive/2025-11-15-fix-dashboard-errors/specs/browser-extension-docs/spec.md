# Spec: Browser Extension Conflict Documentation

## ADDED Requirements

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

## Implementation Notes

### 文件位置
檔案：`docs/BROWSER_EXTENSION_CONFLICTS.md`

### 內容結構

1. **概述**
   - 說明瀏覽器擴充套件可能造成的影響
   - 強調這些錯誤不在專案控制範圍

2. **常見錯誤**
   - `autoinsert.js` 相關錯誤
   - `ERR_BLOCKED_BY_CONTENT_BLOCKER`
   - 其他第三方腳本衝突

3. **可能衝突的擴充套件類型**
   - 廣告攔截器 (AdBlock, uBlock Origin)
   - 自動填表工具 (LastPass, 1Password)
   - 隱私保護工具 (Privacy Badger, Ghostery)
   - 開發者工具擴充套件

4. **除錯步驟**
   - 使用無痕模式測試
   - 逐一停用擴充套件
   - 檢查 Network 和 Console 面板
   - 清除瀏覽器快取

5. **建議**
   - 開發時使用獨立的瀏覽器設定檔
   - 使用 Chrome DevTools 的 Source 面板檢查注入的腳本

### 範例文件內容

```markdown
# 瀏覽器擴充套件衝突

## 概述

在開發和使用過程中，您可能會在瀏覽器 Console 中看到以下錯誤：

- `autoinsert.js:1 Uncaught SyntaxError: Identifier 'isDragging' has already been declared`
- `ERR_BLOCKED_BY_CONTENT_BLOCKER`

這些錯誤來自於瀏覽器擴充套件注入的腳本，**不是專案程式碼的問題**。

## 常見衝突擴充套件

1. **廣告攔截器**
   - AdBlock, AdBlock Plus
   - uBlock Origin
   - Brave Shields

2. **自動填表工具**
   - LastPass
   - 1Password
   - Dashlane

3. **隱私保護**
   - Privacy Badger
   - Ghostery
   - DuckDuckGo Privacy Essentials

## 除錯步驟

### 1. 使用無痕模式
在無痕模式下，大部分擴充套件會被停用：

Chrome/Edge:
Ctrl/Cmd + Shift + N


Firefox:
Ctrl/Cmd + Shift + P


### 2. 檢查擴充套件
1. 開啟 `chrome://extensions/`
2. 逐一停用擴充套件
3. 重新載入頁面測試

### 3. 檢查注入的腳本
1. 開啟 DevTools (F12)
2. 切換到 Sources 面板
3. 查看 Content Scripts 或 Injected Scripts
4. 識別非專案的腳本

## 建議

- 開發時建議使用乾淨的瀏覽器設定檔
- 生產環境測試時使用無痕模式
- 如果錯誤不影響功能，可以忽略
```

## Related Files
- 無（新建文件）

## Acceptance Criteria
- [ ] 建立 `docs/BROWSER_EXTENSION_CONFLICTS.md`
- [ ] 文件包含常見錯誤說明
- [ ] 文件包含可能衝突的擴充套件清單
- [ ] 文件包含除錯步驟
- [ ] 文件包含開發建議
