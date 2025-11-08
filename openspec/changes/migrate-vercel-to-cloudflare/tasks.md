# Cloudflare 遷移實施任務清單

## 1. 前置準備與驗證

### 1.1 程式碼審查與修復
- [ ] 1.1.1 檢查 `package.json` build 指令，確保沒有 `--turbopack` 參數
- [ ] 1.1.2 驗證 `next.config.ts` 包含 `output: 'standalone'` 和 `outputFileTracingRoot`
- [ ] 1.1.3 執行 TypeScript 類型檢查：`pnpm run build`
- [ ] 1.1.4 修復所有 TypeScript 錯誤（如有）
- [ ] 1.1.5 確認 `wrangler.jsonc` 配置正確

### 1.2 環境變數清單準備
- [ ] 1.2.1 從 `.env.local.example` 整理完整的環境變數清單
- [ ] 1.2.2 準備批次設定腳本（參考下方腳本）
- [ ] 1.2.3 獲取 Supabase Pooler URL（格式：`postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`）

**環境變數批次設定腳本**：
```bash
#!/bin/bash
# scripts/setup-cloudflare-secrets.sh

PROJECT_NAME="quotation-system"

declare -a SECRETS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_POOLER_URL"
  "EXCHANGE_RATE_API_KEY"
  "GMAIL_USER"
  "GMAIL_APP_PASSWORD"
  "COMPANY_NAME"
  "NEXT_PUBLIC_APP_URL"
  "CSRF_SECRET"
  "CRON_SECRET"
)

for secret in "${SECRETS[@]}"; do
  echo "設定 $secret..."
  read -sp "請輸入 $secret 的值: " value
  echo
  pnpm exec wrangler secret put "$secret" --name "$PROJECT_NAME" <<< "$value"
done

echo "✅ 所有 secrets 設定完成"
```

### 1.3 本地建置測試
- [ ] 1.3.1 執行 `pnpm run preview:cf` 啟動本地 Cloudflare Workers 環境
- [ ] 1.3.2 驗證所有頁面可正常載入（/zh, /zh/login, /zh/dashboard 等）
- [ ] 1.3.3 檢查瀏覽器 Console 無錯誤（使用 Chrome DevTools）
- [ ] 1.3.4 測試資料庫連線（登入功能、資料查詢）
- [ ] 1.3.5 **測試 PDF 生成功能**（評估是否需要付費版）
  - 存取 `/api/quotations/[id]/pdf`
  - 記錄生成時間
  - 如本地超過 10ms，標記為「可能需付費版」

## 2. Cloudflare 帳戶與專案設定

### 2.1 Cloudflare 帳戶準備
- [ ] 2.1.1 登入 Cloudflare Dashboard（或註冊新帳戶）
- [ ] 2.1.2 記錄 Account ID（Dashboard 右上角）
- [ ] 2.1.3 建立 API Token：
  - 前往 "My Profile" → "API Tokens" → "Create Token"
  - 使用 "Edit Cloudflare Workers" 模板
  - 權限：Account.Cloudflare Pages (Edit), Account.Account Settings (Read)
  - 複製並安全儲存 Token

### 2.2 Cloudflare Pages 專案建立
- [ ] 2.2.1 前往 Cloudflare Dashboard → "Workers & Pages" → "Create Application"
- [ ] 2.2.2 選擇 "Pages" → "Connect to Git"
- [ ] 2.2.3 選擇 GitHub repository（quotation-system）
- [ ] 2.2.4 配置建置設定：
  - Build command: `pnpm run deploy:cf` 或空白（由 GitHub Actions 處理）
  - Build output directory: `.open-next`
  - Framework preset: None（使用 OpenNext）
- [ ] 2.2.5 暫不部署，先設定環境變數

### 2.3 環境變數設定
- [ ] 2.3.1 在本地執行批次設定腳本：
  ```bash
  chmod +x scripts/setup-cloudflare-secrets.sh
  ./scripts/setup-cloudflare-secrets.sh
  ```
- [ ] 2.3.2 驗證環境變數已設定：
  ```bash
  pnpm exec wrangler secret list --name quotation-system
  ```
- [ ] 2.3.3 特別檢查 `SUPABASE_POOLER_URL` 格式正確

## 3. Cron Jobs 遷移

### 3.1 更新 wrangler.jsonc
- [ ] 3.1.1 在 `wrangler.jsonc` 新增 cron triggers：
  ```jsonc
  {
    "name": "quotation-system",
    "main": ".open-next/worker.js",
    "compatibility_date": "2025-03-25",
    "compatibility_flags": ["nodejs_compat"],
    "assets": {
      "directory": ".open-next/assets",
      "binding": "ASSETS"
    },
    "triggers": {
      "crons": ["0 0 * * *"]
    }
  }
  ```

### 3.2 調整 Cron API 路由
- [ ] 3.2.1 編輯 `app/api/cron/exchange-rates/route.ts`
- [ ] 3.2.2 新增 Cloudflare Cron header 檢查：
  ```typescript
  export async function GET(request: Request) {
    const cronHeader = request.headers.get('cf-cron-event')
    const cronSecret = request.headers.get('x-cron-secret')

    if (process.env.NODE_ENV === 'production') {
      if (!cronHeader && cronSecret !== process.env.CRON_SECRET) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    // 原有邏輯...
  }
  ```

### 3.3 測試 Cron 功能
- [ ] 3.3.1 部署後手動觸發測試：
  ```bash
  curl -H "x-cron-secret: YOUR_CRON_SECRET" \
    https://quotation-system.pages.dev/api/cron/exchange-rates
  ```
- [ ] 3.3.2 檢查 Cloudflare Dashboard → Workers & Pages → Cron Triggers 頁面
- [ ] 3.3.3 等待下一次自動執行（隔天 00:00 UTC）並驗證

## 4. GitHub Actions CI/CD 設定

### 4.1 建立 GitHub Secrets
- [ ] 4.1.1 前往 GitHub repository → Settings → Secrets and variables → Actions
- [ ] 4.1.2 新增以下 secrets：
  - `CLOUDFLARE_API_TOKEN`：從步驟 2.1.3 取得的 Token
  - `CLOUDFLARE_ACCOUNT_ID`：從步驟 2.1.2 取得的 Account ID

### 4.2 建立部署 Workflow
- [ ] 4.2.1 建立檔案：`.github/workflows/cloudflare-deploy.yml`
- [ ] 4.2.2 使用以下配置：
  ```yaml
  name: Deploy to Cloudflare Pages

  on:
    push:
      branches:
        - main
    pull_request:
      branches:
        - main

  jobs:
    deploy:
      runs-on: ubuntu-latest
      permissions:
        contents: read
        deployments: write
      steps:
        - name: Checkout
          uses: actions/checkout@v4

        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
            node-version: '20'

        - name: Setup pnpm
          uses: pnpm/action-setup@v4
          with:
            version: 8

        - name: Install dependencies
          run: pnpm install --frozen-lockfile

        - name: Build Next.js
          run: pnpm run build

        - name: Build OpenNext
          run: pnpm exec opennextjs-cloudflare build

        - name: Deploy to Cloudflare Pages
          uses: cloudflare/wrangler-action@v3
          with:
            apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
            accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
            command: pages deploy .open-next --project-name=quotation-system --branch=${{ github.head_ref || github.ref_name }}
  ```

### 4.3 測試自動部署
- [ ] 4.3.1 提交 `.github/workflows/cloudflare-deploy.yml` 到 main 分支
- [ ] 4.3.2 觀察 GitHub Actions 執行狀態
- [ ] 4.3.3 確認部署成功（綠色勾勾）
- [ ] 4.3.4 測試 Preview Deployment（建立 PR 並檢查 Preview URL）

## 5. 功能全面測試

### 5.1 認證流程測試
- [ ] 5.1.1 登入功能（正確帳密）
- [ ] 5.1.2 登入失敗處理（錯誤帳密）
- [ ] 5.1.3 登出功能
- [ ] 5.1.4 Session 持久性（重新整理頁面後仍保持登入）

### 5.2 核心功能測試
- [ ] 5.2.1 儀表板載入（/zh/dashboard）
- [ ] 5.2.2 客戶管理（新增、編輯、刪除、查詢）
- [ ] 5.2.3 產品管理（新增、編輯、刪除、查詢）
- [ ] 5.2.4 報價單建立與編輯
- [ ] 5.2.5 報價單 PDF 匯出（如有此功能）

### 5.3 國際化測試
- [ ] 5.3.1 語系切換（/zh ↔ /en）
- [ ] 5.3.2 URL 重定向正確（/ → /zh 或 /en）
- [ ] 5.3.3 翻譯文字正確顯示

### 5.4 Email 發送測試
- [ ] 5.4.1 測試 Gmail SMTP 發送（如有報價單寄送功能）
- [ ] 5.4.2 檢查 Email 內容正確
- [ ] 5.4.3 如 Gmail 失敗，準備切換到 Resend

### 5.5 PDF 生成功能驗證（免費版 CPU 限制測試）
- [ ] 5.5.1 生成簡單報價單 PDF（1-2 個產品）
- [ ] 5.5.2 生成複雜報價單 PDF（10+ 個產品）
- [ ] 5.5.3 檢查 Cloudflare Logs 是否有 "CPU time limit exceeded" 錯誤
- [ ] 5.5.4 如有 CPU 限制錯誤，評估是否需升級到付費版
- [ ] 5.5.5 記錄決策：
  - ✅ 免費版足夠：繼續使用 $0/月
  - ⚠️ 需升級：前往 Dashboard → Settings → Usage Model → Paid ($5/月)

### 5.6 資料庫連線穩定性測試
- [ ] 5.6.1 執行 10 次連續查詢，確認無失敗
- [ ] 5.6.2 模擬並發請求（5-10 個同時請求）
- [ ] 5.6.3 檢查 Cloudflare Logs 無資料庫連線錯誤

## 6. 效能與監控驗證

### 6.1 效能測試
- [ ] 6.1.1 使用 Chrome DevTools Lighthouse 測試首頁
- [ ] 6.1.2 記錄 TTFB（Time to First Byte）
- [ ] 6.1.3 記錄 FCP、LCP（Core Web Vitals）
- [ ] 6.1.4 與 Vercel 部署對比（如可能）

### 6.2 Cloudflare Analytics 設定
- [ ] 6.2.1 前往 Cloudflare Dashboard → Analytics & Logs → Web Analytics
- [ ] 6.2.2 啟用 Web Analytics
- [ ] 6.2.3 檢查 Requests、Bandwidth、Error Rate

### 6.3 錯誤監控（可選）
- [ ] 6.3.1 考慮整合 Sentry（Cloudflare Workers 支援）
- [ ] 6.3.2 設定錯誤通知（Slack、Email）

## 7. 正式遷移與驗證

### 7.1 DNS 設定（如需自訂網域）
- [ ] 7.1.1 前往 Cloudflare Dashboard → Pages → Custom Domains
- [ ] 7.1.2 新增自訂網域（例如：quotation.yourdomain.com）
- [ ] 7.1.3 更新 DNS CNAME 記錄指向 Cloudflare Pages
- [ ] 7.1.4 等待 DNS 傳播（5 分鐘 - 24 小時）
- [ ] 7.1.5 驗證 SSL 憑證自動配置成功

### 7.2 Vercel 停用計劃
- [ ] 7.2.1 在 Vercel Dashboard 暫停專案（不刪除）
- [ ] 7.2.2 設定 30 天後提醒（作為回滾緩衝期）
- [ ] 7.2.3 30 天後若無問題，刪除 Vercel 專案

### 7.3 最終驗證檢查清單
- [ ] 7.3.1 所有頁面 HTTP 200 狀態碼
- [ ] 7.3.2 資料庫查詢成功率 100%
- [ ] 7.3.3 Cron jobs 自動執行（隔天驗證）
- [ ] 7.3.4 Email 發送成功（如有使用）
- [ ] 7.3.5 GitHub push 觸發自動部署成功
- [ ] 7.3.6 無 Console 錯誤
- [ ] 7.3.7 P95 回應時間 < 1s

## 8. 文件更新與知識轉移

### 8.1 更新專案文件
- [ ] 8.1.1 更新 `README.md`：
  - 移除 Vercel 相關說明
  - 新增 Cloudflare 部署指南
  - 更新環境變數設定步驟
- [ ] 8.1.2 更新 `.env.local.example`：
  - 新增 `SUPABASE_POOLER_URL` 說明
  - 移除 Vercel 專屬變數（如有）
- [ ] 8.1.3 建立 `docs/cloudflare-deployment.md` 詳細指南

### 8.2 團隊知識轉移（如有團隊成員）
- [ ] 8.2.1 分享 Cloudflare Dashboard 存取權限
- [ ] 8.2.2 示範如何查看部署日誌
- [ ] 8.2.3 示範如何手動部署：`pnpm run deploy:cf`
- [ ] 8.2.4 說明如何回滾到先前版本（Cloudflare Pages Deployments 頁面）

## 9. 回滾計劃準備

### 9.1 建立回滾文件
- [ ] 9.1.1 建立 `docs/rollback-to-vercel.md`，包含：
  - Vercel 專案重新啟用步驟
  - DNS 切換回 Vercel 的步驟
  - 預估停機時間（< 5 分鐘）
- [ ] 9.1.2 備份目前 Vercel 配置（截圖或匯出）

### 9.2 測試回滾流程（建議在遷移前執行）
- [ ] 9.2.1 模擬 DNS 切換（使用測試網域）
- [ ] 9.2.2 確認 Vercel 專案可快速重新啟用

## 10. 後續優化（非必要，可延後）

### 10.1 Cloudflare 進階功能
- [ ] 10.1.1 考慮使用 Cloudflare KV 快取（如有高頻查詢資料）
- [ ] 10.1.2 考慮使用 Cloudflare R2（如需檔案上傳功能）
- [ ] 10.1.3 啟用 Cloudflare Zaraz（分析工具整合）

### 10.2 成本優化
- [ ] 10.2.1 檢查 Cloudflare Workers 使用量
- [ ] 10.2.2 如超過 Free Plan，評估升級到 Paid Plan ($5/月)
- [ ] 10.2.3 取消 Vercel 付費方案（如有），節省成本

## 預估時程

| 階段 | 任務數量 | 預估時間 |
|------|----------|----------|
| 1. 前置準備與驗證 | 1.1-1.3 | 1-2 天 |
| 2. Cloudflare 設定 | 2.1-2.3 | 1 天 |
| 3. Cron Jobs 遷移 | 3.1-3.3 | 0.5 天 |
| 4. CI/CD 設定 | 4.1-4.3 | 0.5 天 |
| 5. 功能測試 | 5.1-5.5 | 1-2 天 |
| 6. 效能驗證 | 6.1-6.3 | 0.5 天 |
| 7. 正式遷移 | 7.1-7.3 | 1 天 |
| 8-10. 文件與優化 | 8.1-10.2 | 1 天 |
| **總計** | **96 項任務** | **7-10 天** |

## 成功指標

✅ 遷移成功的標準：
- 所有任務標記為完成（96/96）
- 零停機時間遷移
- 所有功能正常運作
- 效能持平或改善
- GitHub 自動部署正常
- 團隊成員熟悉新平台

## 緊急聯絡與支援

- Cloudflare Support: https://support.cloudflare.com/
- OpenNext GitHub Issues: https://github.com/opennextjs/opennextjs-cloudflare/issues
- Supabase Support: https://supabase.com/support
