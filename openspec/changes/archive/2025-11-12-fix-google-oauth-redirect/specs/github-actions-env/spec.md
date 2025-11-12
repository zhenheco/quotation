# Spec Delta: GitHub Actions 環境變數配置

## MODIFIED Requirements

### Requirement: GitHub Actions 建置 SHALL 使用真實的 Supabase 環境變數

**背景**：
現況使用 placeholder 環境變數進行建置，導致 client-side 程式碼中寫死了錯誤的 Supabase URL。

**變更內容**：
從使用 hardcoded placeholder 值改為從 GitHub Secrets 讀取真實值。系統 SHALL 在建置時注入正確的環境變數。

#### Scenario: 建置階段注入正確的 Supabase 環境變數
```gherkin
Given GitHub Actions workflow 執行建置步驟
When 執行 pnpm run build 或 opennextjs-cloudflare build
Then 必須使用 ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }} 和 ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
And 不得使用 hardcoded placeholder 值
And 建置產物中的 client-side 程式碼包含正確的 Supabase URL
```

#### Scenario: 缺少必要環境變數時建置失敗
```gherkin
Given GitHub Secrets 中缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY
When 執行建置步驟
Then 建置應該失敗並提供清晰的錯誤訊息
And 錯誤訊息應指出缺少哪個環境變數
```

#### Scenario: 建置日誌不洩漏敏感資訊
```gherkin
Given 使用 GitHub Secrets 進行建置
When 查看 GitHub Actions 建置日誌
Then 日誌中不應顯示完整的 Supabase URL 或 Anon Key
And 敏感資訊應被遮罩顯示（例如：***）
```

### Requirement: 建置產物中的環境變數 MUST 可驗證

**背景**：
需要確保建置產物中包含正確的環境變數，而非 placeholder。

**變更內容**：
新增驗證步驟確認建置產物的正確性。系統 MUST 提供自動化驗證機制。

#### Scenario: 建置後驗證環境變數
```gherkin
Given 建置完成
When 檢查建置產物（.next/ 或 .open-next/）
Then 使用 grep 或類似工具搜尋 placeholder.supabase.co 應找不到結果
And 搜尋實際的 Supabase URL 應能找到至少一個匹配
```

#### Scenario: CI/CD pipeline 自動驗證
```gherkin
Given GitHub Actions workflow 完成建置
When 執行自動驗證步驟
Then 驗證腳本檢查建置產物中是否包含 placeholder 值
And 如果發現 placeholder 值，workflow 應該失敗
```

## ADDED Requirements

### Requirement: GitHub Repository SHALL 配置必要的 Secrets

**背景**：
為了支援建置時注入真實環境變數，需要在 GitHub Repository 中設定 Secrets。管理員 SHALL 設定所有必要的 secrets。

#### Scenario: 新增 Supabase 環境變數 Secrets
```gherkin
Given 管理員存取 GitHub Repository Settings
When 前往 Secrets and variables → Actions
Then 必須新增以下 secrets
And 新增 NEXT_PUBLIC_SUPABASE_URL（實際的 Supabase 專案 URL）
And 新增 NEXT_PUBLIC_SUPABASE_ANON_KEY（實際的 Supabase Anon Key）
```

#### Scenario: Secrets 設定後可在 workflow 中使用
```gherkin
Given Secrets 已在 GitHub Repository 中設定
When GitHub Actions workflow 執行
Then workflow 能夠讀取 secrets.NEXT_PUBLIC_SUPABASE_URL
And workflow 能夠讀取 secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY
And 這些值能正確傳遞給建置步驟
```

### Requirement: 文件 MUST 說明環境變數配置流程

**背景**：
新的團隊成員或協作者需要清楚的指引來設定必要的環境變數。專案 MUST 提供完整的設定文件。

#### Scenario: 部署文件包含 GitHub Secrets 設定步驟
```gherkin
Given 開發者閱讀部署相關文件（如 DEPLOYMENT_CHECKLIST.md）
When 查看環境變數配置章節
Then 文件應說明需要設定哪些 GitHub Secrets
And 文件應說明如何取得這些 Secret 的值
And 文件應說明如何在 GitHub Repository 中新增 Secrets
And 文件應說明如果缺少 Secrets 會發生什麼
```

#### Scenario: README 包含快速設定指引
```gherkin
Given 新貢獻者閱讀 README.md
When 查看設定章節
Then 應包含 GitHub Secrets 設定的快速指引
And 提供相關文件的連結
```

## REMOVED Requirements

### Requirement: ~~允許使用 placeholder 環境變數進行建置~~

**移除原因**：
使用 placeholder 環境變數會導致 client-side 程式碼包含錯誤的 URL，造成 OAuth 重定向失敗。

**影響**：
- 移除 `.github/workflows/cloudflare-deploy.yml` 中所有 hardcoded placeholder 值
- 未來所有建置都必須使用真實的環境變數

#### Scenario: ~~建置階段使用 placeholder.supabase.co~~（已移除）

此場景不再有效，已被「建置階段注入正確的 Supabase 環境變數」取代。

## 相依性

### 前置條件

1. **Supabase 專案已建立並配置**
   - 專案 URL 可用
   - Anon Key 已生成
   - Google OAuth Provider 已啟用

2. **GitHub Repository Settings 存取權限**
   - 需要 Admin 或 Maintainer 權限來新增 Secrets

### 後續變更

完成此變更後，以下項目可能需要調整：

1. **Cloudflare Workers Secrets**
   - 評估是否需要保留 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - 這些 secrets 在執行時無效（已在建置時寫死），但保留它們不會造成問題

2. **本地開發環境**
   - 確保 `.env.local` 包含真實的環境變數
   - 更新 `.env.example` 提供清晰的範例

## 測試策略

### 單元測試

不適用（這是配置變更，無需單元測試）

### 整合測試

1. **建置測試**
   - 觸發 GitHub Actions workflow
   - 驗證建置成功完成
   - 檢查建置日誌確認使用正確的環境變數

2. **產物驗證**
   - 檢查 `.next/` 或 `.open-next/` 中的檔案
   - 確認不包含 "placeholder.supabase.co"
   - 確認包含實際的 Supabase URL

### 端對端測試

1. **部署後測試**
   - 部署到 Cloudflare Workers
   - 存取應用程式
   - 測試 Google OAuth 登入流程
   - 確認成功登入並重定向

2. **錯誤處理測試**
   - 暫時移除一個 Secret
   - 觸發建置
   - 驗證建置失敗並顯示清晰的錯誤訊息

## 安全性考量

### 敏感資訊保護

1. **GitHub Secrets 加密**
   - GitHub 自動加密所有 Secrets
   - Secrets 在日誌中自動遮罩

2. **最小權限原則**
   - 只有必要的環境變數存放在 GitHub Secrets
   - 不將 Service Role Key 存放在 GitHub Secrets（除非絕對必要）

### Anon Key 安全性

1. **公開性質**
   - Supabase Anon Key 設計為公開使用
   - 受 Row Level Security (RLS) 保護
   - 儲存在 GitHub Secrets 是合理的做法

2. **定期輪換**
   - 建議定期輪換 API Keys（如果有安全疑慮）
   - 輪換後需要同步更新 GitHub Secrets 和 Cloudflare Workers Secrets

## 效能影響

### 建置時間

- ✅ **無影響**：從 GitHub Secrets 讀取環境變數不會增加建置時間
- ✅ **無額外步驟**：不需要額外的 API 請求或處理

### 執行時效能

- ✅ **無影響**：環境變數在建置時寫死，執行時無額外開銷
- ✅ **最佳實踐**：符合 Next.js 對 `NEXT_PUBLIC_*` 環境變數的處理方式

## 向後相容性

### 破壞性變更

- ⚠️ **需要新增 GitHub Secrets**：沒有設定 Secrets 的 fork 或新 clone 無法建置
- ⚠️ **移除 placeholder 支援**：不再支援使用 placeholder 環境變數進行建置

### 遷移策略

1. **通知所有協作者**
   - 發送公告說明新的環境變數需求
   - 提供設定指引

2. **更新文件**
   - 在 README 和 DEPLOYMENT_CHECKLIST 中說明變更
   - 提供疑難排解指引

3. **Graceful Degradation**
   - 不適用（必須使用正確的環境變數才能正常運作）

## 驗收標準

此變更符合以下所有條件才算完成：

1. ✅ `.github/workflows/cloudflare-deploy.yml` 已更新為使用 GitHub Secrets
2. ✅ GitHub Repository 已設定必要的 Secrets
3. ✅ 新的建置不包含 "placeholder.supabase.co"
4. ✅ Google OAuth 登入成功，無 DNS 錯誤
5. ✅ 建置日誌中敏感資訊被正確遮罩
6. ✅ 相關文件已更新（DEPLOYMENT_CHECKLIST.md、README.md）
7. ✅ 所有測試通過（建置測試、產物驗證、端對端測試）
