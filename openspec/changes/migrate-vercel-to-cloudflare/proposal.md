# Vercel 到 Cloudflare 部署平台遷移提案

## Why

目前專案部署於 Vercel，但考量到：
1. Cloudflare Workers 提供更好的全球邊緣網路效能
2. 專案已配置 `@opennextjs/cloudflare` 和 `wrangler`，具備遷移基礎
3. Cloudflare 提供更靈活的定價和資源配置
4. 資料庫已使用 Supabase，支援 Cloudflare Workers 連線（透過 @neondatabase/serverless）

需要完整評估可行性並制定遷移計劃，確保平滑過渡且保留 GitHub 自動部署功能。

## What Changes

### 技術評估
- **Next.js 15 相容性**：專案使用 Next.js 15.5.5，需確認 OpenNext 支援度
- **國際化支援**：next-intl 在 Cloudflare Workers 的執行狀況
- **資料庫連線**：已實作 Cloudflare Workers 偵測邏輯（zeabur.ts:9），使用 @neondatabase/serverless
- **Middleware**：自訂 middleware（next-intl + Supabase SSR）需驗證相容性
- **Cron Jobs**：Vercel Cron（vercel.json:2-7）需改為 Cloudflare Cron Triggers
- **Email 服務**：Gmail SMTP 和 Resend 均支援 Cloudflare Workers
- **檔案上傳**：若使用本地檔案系統需改為 R2 或外部儲存

### 部署配置變更
- 建立或更新 `wrangler.jsonc` 配置
- 設定環境變數（透過 wrangler secret）
- 配置 GitHub Actions 自動部署工作流程
- 建立 `open-next.config.ts` 最佳化設定

### CI/CD 流程
- 建立 `.github/workflows/cloudflare-deploy.yml`
- 配置 GitHub Secrets（CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID）
- 測試自動部署流程

### 回滾計劃
- 保留 Vercel 專案配置至少 30 天
- 建立詳細的回滾步驟文件
- 驗證資料庫連線切換流程

## Impact

### 受影響的元件
- **部署平台**：從 Vercel 切換到 Cloudflare Workers/Pages
- **資料庫連線**：需驗證 Supabase Pooler 配置（SUPABASE_POOLER_URL）
- **環境變數管理**：從 Vercel 環境變數遷移到 Cloudflare Secrets
- **Cron Jobs**：`/api/cron/exchange-rates` 需改用 Cloudflare Cron Triggers
- **Build 流程**：使用 OpenNext 而非 Vercel Build

### 潛在風險
1. **Next.js 15 相容性**：OpenNext 可能對新版 Next.js 支援不完整
2. **Middleware 行為差異**：Cloudflare Workers 環境限制可能影響 middleware
3. **冷啟動延遲**：Workers 冷啟動可能比 Vercel Serverless Functions 慢
4. **Debug 困難度**：Cloudflare 的日誌和 debugging 工具與 Vercel 不同

### 遷移優先級
**高優先級（必須解決）**：
- Next.js 15 + next-intl 相容性驗證
- 資料庫連線穩定性測試
- Cron jobs 遷移

**中優先級（重要但可延後）**：
- CI/CD 自動化配置
- 效能監控和日誌整合

**低優先級（可選）**：
- 檔案上傳改用 R2
- 使用 Cloudflare KV 優化快取

### 成本考量與方案選擇

**目標：優先使用免費版**

#### 使用量預估（內部報價系統）
- **使用者數**：5-50 人
- **每日請求數**：1,000-5,000（遠低於免費版 100,000 限制）
- **每月流量**：3-5 GB（免費版提供 10 GB）
- **結論**：免費版完全足夠 ✅

#### 唯一潛在風險：PDF 生成 CPU 時間
- **免費版 CPU 限制**：10ms/請求
- **PDF 生成預估**：簡單 PDF 5-20ms，複雜 PDF 50-200ms
- **策略**：
  1. 先部署到免費版測試 PDF 功能
  2. 如遇 CPU 限制錯誤才升級到 Paid Plan ($5/月)
  3. 付費版提供 50ms CPU 時間，足夠處理複雜 PDF

#### 成本比較
```
Vercel:
├─ Hobby Free：$0（功能受限）
└─ Pro：$20/月

Cloudflare（建議）:
├─ Free Plan：$0 ✅ 優先使用
└─ Paid Plan：$5/月（僅在 PDF 需要時）

節省：$15-20/月
```

**決定**：優先使用 Cloudflare 免費版，僅在實際測試發現 CPU 不足時才升級

## Next Steps

1. **階段一：技術驗證（3-5 天）**
   - 本地測試 OpenNext 建置
   - 驗證 middleware 和 i18n 功能
   - 測試資料庫連線

2. **階段二：部署配置（2-3 天）**
   - 配置 wrangler.jsonc
   - 設定環境變數
   - 建立 GitHub Actions workflow

3. **階段三：測試部署（2-3 天）**
   - Preview 環境測試
   - Cron jobs 功能驗證
   - 效能和穩定性測試

4. **階段四：正式遷移（1 天）**
   - 執行正式部署
   - DNS 切換（如需要）
   - 監控和驗證

## 相關檔案
- `next.config.ts` - Next.js 配置（已包含 standalone 輸出）
- `wrangler.jsonc` - Cloudflare Workers 配置（已存在）
- `lib/db/zeabur.ts` - 資料庫連線邏輯（已支援 Cloudflare Workers）
- `vercel.json` - Vercel 配置（Cron jobs）
- `package.json` - 已包含 OpenNext 和 Wrangler 套件
