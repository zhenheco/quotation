# Proposal: 修正 Google OAuth 登入重定向到 placeholder.supabase.co 錯誤

## Why

使用者透過 Google 登入時被重定向到 `placeholder.supabase.co`，導致 `DNS_PROBE_FINISHED_NXDOMAIN` 錯誤，無法完成登入流程。根本原因是 GitHub Actions 在建置時使用 placeholder 環境變數，這些值被 Next.js 編譯進 client-side bundle。

## 根本原因分析

### 1. 建置時環境變數問題

**現況**：
- GitHub Actions 在建置階段使用假的環境變數（`placeholder.supabase.co`）
- Next.js 將這些建置時環境變數編譯進 client-side bundle
- Cloudflare Workers 雖然有正確的 runtime secrets，但 client 端程式碼仍使用建置時的值

**影響範圍**：
```typescript
// lib/supabase/client.ts:5
process.env.NEXT_PUBLIC_SUPABASE_URL  // ← 在建置時被替換為 placeholder
```

**證據**：
- `.github/workflows/cloudflare-deploy.yml:73,80` 使用 `https://placeholder.supabase.co`
- `app/[locale]/login/LoginButton.tsx:11-16` 呼叫 `signInWithOAuth` 時使用 client 端的 Supabase 實例

### 2. Next.js 環境變數處理機制

Next.js 對於 `NEXT_PUBLIC_*` 前綴的環境變數：
- ✅ **建置時替換**：在 `next build` 階段將所有 `process.env.NEXT_PUBLIC_*` 替換為實際值
- ❌ **無法在執行時覆蓋**：一旦建置完成，這些值就被寫死在 bundle 中

**這導致**：
- 即使 Cloudflare Workers 有正確的 secrets
- Client-side 程式碼仍然使用建置時的 placeholder 值

## 解決方案選項

### 選項 A：在 GitHub Actions 中使用真實的環境變數（推薦）

**優點**：
- ✅ 符合 Next.js 的標準做法
- ✅ 不需要修改程式碼架構
- ✅ 效能最佳（無額外執行時開銷）

**缺點**：
- ⚠️ 需要在 GitHub Secrets 中儲存 Supabase URL 和 Anon Key
- ⚠️ 每次變更 Supabase 專案需要更新 GitHub Secrets

**實作步驟**：
1. 在 GitHub Secrets 中新增 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. 修改 `.github/workflows/cloudflare-deploy.yml` 使用這些 secrets
3. 移除 Cloudflare Workers 中多餘的 secrets（這些值已在建置時寫死）

### 選項 B：使用執行時環境變數注入（不推薦）

**優點**：
- ✅ 可以在不重新建置的情況下變更環境變數

**缺點**：
- ❌ 需要大幅修改程式碼架構
- ❌ 增加執行時開銷
- ❌ 與 Next.js 的最佳實踐不符
- ❌ 可能影響 SSR 和 client hydration

**實作步驟**（僅供參考，不推薦）：
1. 建立 API endpoint 提供環境變數
2. 在 client 端動態載入環境變數
3. 延遲初始化 Supabase client

### 選項 C：多環境建置（過度複雜）

**優點**：
- ✅ 可以為不同環境建置不同的 bundle

**缺點**：
- ❌ 過度複雜
- ❌ 增加建置時間和儲存空間
- ❌ 不適合這個問題的規模

## What Changes

採用**選項 A：在 GitHub Actions 中使用真實的環境變數**

### 修改的檔案

- `.github/workflows/cloudflare-deploy.yml`：使用 GitHub Secrets 而非 hardcoded placeholder
- `DEPLOYMENT_CHECKLIST.md`：新增 GitHub Secrets 設定說明
- `README.md`（可選）：更新環境變數設定指引

### 需要新增的 GitHub Secrets

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### **BREAKING**: 建置流程變更

- 所有協作者需要在 fork 中設定相同的 GitHub Secrets
- 沒有設定 Secrets 的環境無法成功建置

## Impact

### Affected specs
- `github-actions-env`：CI/CD 環境變數配置

### Affected code
- `.github/workflows/cloudflare-deploy.yml`：建置流程
- `lib/supabase/client.ts`：使用環境變數（無需修改）
- `lib/supabase/server.ts`：使用環境變數（無需修改）

### 理由

1. **符合 Next.js 最佳實踐**：
   - Next.js 官方文件明確建議在建置時注入 `NEXT_PUBLIC_*` 環境變數
   - 這是最標準、最可靠的做法

2. **安全性考量**：
   - Supabase Anon Key 本身就設計為公開的（受 RLS 保護）
   - URL 也是公開資訊
   - 因此儲存在 GitHub Secrets 中是合理的

3. **維護成本最低**：
   - 不需要修改程式碼架構
   - 只需要一次性設定 GitHub Secrets

4. **效能最佳**：
   - 無執行時開銷
   - 不影響 SSR 或 client hydration

## 需要用戶確認的資訊

在實作前，需要確認以下資訊：

1. **實際的 Supabase 專案資訊**：
   - Supabase 專案 URL（例如：`https://xxxxx.supabase.co`）
   - Supabase Anon Key

2. **Google OAuth 設定**：
   - 是否已在 Supabase Dashboard 中啟用 Google Provider？
   - Redirect URL 是否設定正確（應為 `https://[your-domain]/auth/callback`）？

3. **Cloudflare Workers 部署網址**：
   - 實際的 production URL（例如：`https://quotation-system.your-subdomain.workers.dev`）

## 影響範圍

### 修改的檔案

1. `.github/workflows/cloudflare-deploy.yml`
   - 將 hardcoded placeholder 改為從 GitHub Secrets 讀取

### 需要新增的 GitHub Secrets

1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 可能需要移除的 Cloudflare Workers Secrets

這些 secrets 在建置時已經寫死，執行時設定無效：
- `NEXT_PUBLIC_SUPABASE_URL`（可保留但不會被使用）
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`（可保留但不會被使用）

### 不需要修改的檔案

以下檔案不需要修改，因為它們已經正確使用 `process.env.NEXT_PUBLIC_*`：
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `app/[locale]/login/LoginButton.tsx`
- `middleware.ts`

## 測試計劃

1. **本地測試**：
   - 使用真實的 Supabase 環境變數
   - 測試 Google OAuth 登入流程
   - 確認重定向 URL 正確

2. **CI/CD 測試**：
   - 設定 GitHub Secrets
   - 觸發新的建置
   - 檢查建置日誌確認環境變數正確載入

3. **部署後測試**：
   - 存取 Cloudflare Workers 部署的應用
   - 測試 Google OAuth 登入
   - 確認能成功登入並重定向到 dashboard

## 預期成果

- ✅ Google OAuth 登入成功，重定向到正確的 Supabase 專案
- ✅ 無 DNS 錯誤
- ✅ 使用者能順利完成登入流程並進入 dashboard

## 相關文件

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Supabase OAuth Configuration](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
