# Ralph Fix Plan - Vercel 遷移

> **狀態**：✅ 程式碼遷移完成
> **目標**：將應用程式從 Cloudflare Workers 遷移至 Vercel
> **原因**：Bundle 大小（13 MiB）超過 Workers 限制（10 MiB）
> **驗證結果**：`pnpm run build` ✅ | `pnpm run lint` ✅ | `pnpm run typecheck` ✅
> **最後更新**：2025-12-30

---

## ✅ 已完成 - 程式碼層級遷移

所有程式碼層級的 Cloudflare 清理工作已完成：

- [x] **next.config.ts** - 移除 OpenNext 初始化和 Cloudflare 配置
- [x] **移除依賴** - `@opennextjs/cloudflare`, `wrangler`, `@cloudflare/workers-types`
- [x] **清理 scripts** - 移除 `preview:cf`, `deploy:cf`, `cf-typegen`
- [x] **刪除檔案** - `deploy-cloudflare.yml`, `cloudflare-env.d.ts`, `.open-next/`, `open-next.config.ts`
- [x] **移除 KV 相關代碼** - `lib/middleware/rate-limiter.ts` 中的 Cloudflare KV 部分
- [x] **更新 tsconfig.json** - 移除 `@cloudflare/workers-types`，排除 `workers/` 目錄
- [x] **Build 驗證** - 成功
- [x] **Lint 驗證** - 通過
- [x] **TypeScript 驗證** - 通過

---

## 🟢 待執行 - Vercel Dashboard 設定（手動）

> 以下項目需要在 Vercel Dashboard 手動設定

### 1. 建立 Vercel 專案

1. 登入 [Vercel Dashboard](https://vercel.com/dashboard)
2. Import Git Repository → 選擇 quotation-system
3. 框架會自動識別為 Next.js

### 2. 設定環境變數

在 Vercel Dashboard → Settings → Environment Variables 設定：

**必要變數（Production + Preview）：**
```
NEXT_PUBLIC_SUPABASE_URL=<你的 Supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<你的 Supabase Anon Key>
SUPABASE_SERVICE_ROLE_KEY=<你的 Service Role Key>
NEXT_PUBLIC_APP_URL=https://quote24.cc

# Email (Brevo)
BREVO_API_KEY=<Brevo API Key>
BREVO_SENDER_EMAIL=<寄件者 Email>
BREVO_SENDER_NAME=<寄件者名稱>

# AI OCR
QWEN_API_KEY=<Qwen API Key>
CF_AIG_TOKEN=<Cloudflare AI Gateway Token>
```

### 3. 設定自定義域名

1. Vercel Dashboard → Settings → Domains
2. 添加 `quote24.cc`
3. 更新 DNS：
   - 如果使用 Cloudflare DNS：設定 CNAME 指向 `cname.vercel-dns.com`
   - 關閉 Cloudflare Proxy（橙色雲 → 灰色）

### 4. 更新 Supabase OAuth 設定

在 Supabase Dashboard → Authentication → URL Configuration：

1. **Site URL**: `https://quote24.cc`
2. **Redirect URLs** 添加：
   - `https://quote24.cc/**`
   - `https://*.vercel.app/**`（用於預覽部署）

---

## 📝 Notes

- `workers/` 目錄保留作為獨立的 Cloudflare Workers 專案（observability-api）
- `wrangler.toml` 保留作為備份參考
- R2 Storage 可繼續使用（通過 API 調用）
- Cloudflare DNS 可繼續使用

---

## 完成條件

當滿足以下條件時，此任務視為完成：

- [x] 所有 Cloudflare 程式碼已移除
- [x] Build/Lint/TypeCheck 通過
- [ ] Vercel 專案已建立並連接 GitHub
- [ ] 環境變數已設定
- [ ] 自定義域名 quote24.cc 已設定
- [ ] Supabase OAuth redirect URLs 已更新
- [ ] 部署成功
- [ ] 登入功能正常
