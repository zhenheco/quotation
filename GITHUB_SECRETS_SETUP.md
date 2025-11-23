# GitHub Secrets 設定指南

## 🔐 需要設定的 GitHub Secrets

請前往以下網址設定：
**https://github.com/zhenheco/quotation/settings/secrets/actions**

---

## ✅ 已自動確認的資訊

### Cloudflare 配置（已完成）
- **Worker 名稱**: `quotation-system`
- **Account ID**: `f9916b95d011e8ad2a3fe10883053b0f`
- **KV Namespace ID**: `ae9ae82472024c009a0513d9e007c4b9`
- **D1 Database ID**: `de903a85-2741-4179-8bd0-34631cc64b08`

### Cloudflare Worker Secrets（已完成）
以下環境變數已在 Cloudflare Worker 中設定完成：
- ✅ `BREVO_API_KEY`
- ✅ `COMPANY_NAME`
- ✅ `CRON_SECRET`
- ✅ `CSRF_SECRET`
- ✅ `EXCHANGE_RATE_API_KEY`
- ✅ `NEXT_PUBLIC_APP_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NODE_ENV`
- ✅ `SUPABASE_DB_URL`
- ✅ `SUPABASE_POOLER_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

---

## ⏳ 需要手動設定的 GitHub Secrets

### 必需的 Secrets（共 4 個）

#### 1. CLOUDFLARE_API_TOKEN
**用途**: GitHub Actions 部署到 Cloudflare 時使用
**取得方式**:
1. 前往 https://dash.cloudflare.com/profile/api-tokens
2. 點擊「Create Token」
3. 使用「Edit Cloudflare Workers」模板
4. 或自訂權限：
   - Account > Workers Scripts > Edit
   - Account > Workers KV Storage > Edit
   - Account > D1 > Edit

**設定值**: 從 `.env.local` 複製 `CLOUDFLARE_API_TOKEN` 的值

---

#### 2. CLOUDFLARE_ACCOUNT_ID
**用途**: 指定要部署到哪個 Cloudflare 帳戶
**設定值**: `f9916b95d011e8ad2a3fe10883053b0f`

---

#### 3. NEXT_PUBLIC_SUPABASE_URL
**用途**: Next.js 建置時需要的 Supabase URL
**設定值**: 從 `.env.local` 複製 `NEXT_PUBLIC_SUPABASE_URL` 的值

---

#### 4. NEXT_PUBLIC_SUPABASE_ANON_KEY
**用途**: Next.js 建置時需要的 Supabase Anon Key
**設定值**: 從 `.env.local` 複製 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 的值

---

## 📋 設定步驟

1. **開啟 GitHub Secrets 頁面**
   https://github.com/zhenheco/quotation/settings/secrets/actions

2. **點擊「New repository secret」**

3. **逐一新增以下 Secrets**：

   | Name | Value |
   |------|-------|
   | `CLOUDFLARE_API_TOKEN` | 從 `.env.local` 複製 |
   | `CLOUDFLARE_ACCOUNT_ID` | `f9916b95d011e8ad2a3fe10883053b0f` |
   | `NEXT_PUBLIC_SUPABASE_URL` | 從 `.env.local` 複製 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 從 `.env.local` 複製 |

4. **驗證設定**
   設定完成後，推送任何 commit 到 `main` 分支，GitHub Actions 會自動觸發部署。

---

## 🔍 驗證部署

設定完成後，可以透過以下方式驗證：

```bash
# 查看最近的 GitHub Actions 運行
gh run list --limit 5

# 查看特定運行的日誌
gh run view <run-id> --log
```

或直接前往：
https://github.com/zhenheco/quotation/actions

---

## ⚠️ 注意事項

1. **API Token 權限**: 確保 Cloudflare API Token 有 Workers、KV、D1 的編輯權限
2. **Token 過期**: 如果設定了過期時間，記得定期更新
3. **安全性**: 絕對不要將這些 Secrets commit 到程式碼中
4. **測試**: 建議先在本地執行 `pnpm run build` 確認無誤後再推送

---

## ✅ 完成檢查清單

- [ ] 設定 `CLOUDFLARE_API_TOKEN`
- [ ] 設定 `CLOUDFLARE_ACCOUNT_ID`
- [ ] 設定 `NEXT_PUBLIC_SUPABASE_URL`
- [ ] 設定 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] 推送 commit 測試自動部署
- [ ] 確認 GitHub Actions 運行成功
- [ ] 確認 Cloudflare Worker 已更新
✅ GitHub Secrets 已自動設定完成 (2025-11-23)
