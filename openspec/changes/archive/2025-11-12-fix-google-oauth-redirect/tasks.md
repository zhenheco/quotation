# Tasks: 修正 Google OAuth 登入重定向錯誤

## 前置作業（需要用戶提供資訊）

- [ ] **確認 Supabase 專案資訊**
  - [ ] 取得實際的 Supabase URL（格式：`https://xxxxx.supabase.co`）
  - [ ] 取得 Supabase Anon Key
  - [ ] 確認 Supabase Dashboard 中 Google Provider 已啟用

- [ ] **確認 Cloudflare Workers 部署資訊**
  - [ ] 取得 production URL（例如：`https://quotation-system.your-subdomain.workers.dev`）

- [ ] **檢查 Google OAuth 設定**
  - [ ] 在 Supabase Dashboard → Authentication → URL Configuration
  - [ ] 確認 Redirect URLs 包含：`https://[cloudflare-workers-url]/auth/callback`
  - [ ] 確認 Site URL 設定為 Cloudflare Workers URL

## 階段一：設定 GitHub Secrets

- [ ] **新增 GitHub Repository Secrets**
  1. 前往 GitHub repository → Settings → Secrets and variables → Actions
  2. 點擊 "New repository secret"
  3. 新增以下 secrets：
     - Name: `NEXT_PUBLIC_SUPABASE_URL`
       Value: `[實際的 Supabase URL]`
     - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
       Value: `[實際的 Supabase Anon Key]`

## 階段二：修改 CI/CD 配置

- [ ] **更新 `.github/workflows/cloudflare-deploy.yml`**
  - [ ] 將 "Build application" 步驟的環境變數改為使用 GitHub Secrets
    ```yaml
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
    ```
  - [ ] 將 "Build OpenNext for Cloudflare Workers" 步驟的環境變數改為使用 GitHub Secrets
    ```yaml
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
    ```

- [ ] **提交變更**
  - [ ] Commit message: `修正: 使用真實的 Supabase 環境變數進行建置`
  - [ ] 建立新分支：`fix/google-oauth-redirect`

## 階段三：清理 Cloudflare Workers Secrets（可選）

> **注意**：這些 secrets 在建置時已經寫死，執行時設定無效，但保留它們也不會造成問題

- [ ] **檢查現有 Cloudflare Workers secrets**
  ```bash
  pnpm exec wrangler secret list --name quotation-system
  ```

- [ ] **決定是否保留以下 secrets**（可選）：
  - `NEXT_PUBLIC_SUPABASE_URL`（建議保留，以防未來需要）
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`（建議保留，以防未來需要）

## 階段四：測試與驗證

- [ ] **觸發 CI/CD 建置**
  - [ ] 推送變更到 GitHub
  - [ ] 等待 GitHub Actions 完成建置
  - [ ] 檢查建置日誌，確認環境變數正確載入

- [ ] **檢查建置產物**
  - [ ] 在建置日誌中搜尋 "placeholder.supabase.co"，應該找不到
  - [ ] 確認建置成功完成

- [ ] **本地測試（可選）**
  - [ ] 使用真實的環境變數在本地建置：
    ```bash
    NEXT_PUBLIC_SUPABASE_URL=[實際 URL] \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=[實際 Key] \
    pnpm run build
    ```
  - [ ] 檢查建置產物中的環境變數是否正確

- [ ] **部署後測試**
  - [ ] 等待部署到 Cloudflare Workers 完成
  - [ ] 存取 production URL
  - [ ] 測試 Google OAuth 登入流程：
    1. 點擊 "使用 Google 登入"
    2. 選擇 Google 帳號
    3. 確認重定向到正確的 Supabase 專案（不是 placeholder.supabase.co）
    4. 確認成功登入並重定向到 dashboard

- [ ] **驗證登入狀態**
  - [ ] 檢查瀏覽器 Console 是否有錯誤
  - [ ] 檢查 Network 標籤，確認 API 請求使用正確的 Supabase URL
  - [ ] 確認使用者資料正確儲存在 Supabase

## 階段五：文件更新

- [ ] **更新 DEPLOYMENT_CHECKLIST.md**
  - [ ] 在「GitHub Actions 環境變數」章節新增：
    - 必須在 GitHub Secrets 中設定 `NEXT_PUBLIC_SUPABASE_URL`
    - 必須在 GitHub Secrets 中設定 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- [ ] **更新 README.md**（如果有相關章節）
  - [ ] 說明環境變數設定方式
  - [ ] 說明 GitHub Secrets 的必要性

## 階段六：後續優化（可選）

- [ ] **建立環境變數驗證腳本**
  - [ ] 在建置前檢查必要的環境變數是否存在
  - [ ] 如果缺少環境變數，提供清晰的錯誤訊息

- [ ] **新增建置時環境變數檢查**
  - [ ] 在 GitHub Actions 中新增步驟驗證環境變數
  - [ ] 確保不會使用 placeholder 值進行建置

## 完成標準

所有以下條件都滿足才算完成：

1. ✅ GitHub Secrets 已正確設定
2. ✅ GitHub Actions workflow 已更新
3. ✅ 新的建置不再使用 placeholder.supabase.co
4. ✅ Google OAuth 登入成功，無 DNS 錯誤
5. ✅ 使用者能成功登入並重定向到 dashboard
6. ✅ 相關文件已更新

## 風險與注意事項

⚠️ **風險**：
- GitHub Secrets 一旦設定，無法直接查看（只能覆蓋）
- 如果設定錯誤，需要重新設定並重新建置

🔒 **安全性**：
- Supabase Anon Key 是公開的，受 RLS 保護，儲存在 GitHub Secrets 是安全的
- 不要將 Service Role Key 儲存在 GitHub Secrets 中（除非絕對必要且加密保護）

📝 **建議**：
- 保留一份環境變數的備份（在安全的地方，如密碼管理器）
- 定期輪換 Supabase API Keys（如果需要）
