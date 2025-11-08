# Cloudflare 部署架構設計

## Context

### 現有架構
- **平台**：Vercel
- **框架**：Next.js 15.5.5 (App Router + Server Components)
- **資料庫**：Supabase PostgreSQL（認證 + 業務資料）
- **國際化**：next-intl
- **認證**：Supabase Auth with SSR
- **定時任務**：Vercel Cron（每日匯率同步）

### 技術限制
1. **Cloudflare Workers 限制**：
   - 無檔案系統存取（需改用 R2 或外部儲存）
   - CPU 時間限制（10ms - 50ms，付費方案可達 30s）
   - 記憶體限制（128MB）
   - 不支援所有 Node.js API（需 nodejs_compat 標誌）

2. **OpenNext for Cloudflare**：
   - 需 Next.js `output: 'standalone'` 模式（已配置）
   - 需明確設定 `outputFileTracingRoot`（已配置）
   - 不支援 Turbopack（需確認 build 指令）

3. **資料庫連線**：
   - Cloudflare Workers 需使用 WebSocket-based pooler
   - Supabase 提供 Pooler URL（格式：`pooler.supabase.com`）
   - 已實作環境偵測邏輯（`lib/db/zeabur.ts`）

## Goals / Non-Goals

### Goals
- ✅ 遷移到 Cloudflare Workers/Pages，保留所有功能
- ✅ 實現 GitHub push 自動部署
- ✅ 維持或改善目前的效能和可靠性
- ✅ 降低部署成本
- ✅ 保留完整的回滾能力

### Non-Goals
- ❌ 改變應用程式核心邏輯或 UI
- ❌ 升級 Next.js 或其他主要依賴版本
- ❌ 實作 Cloudflare 專屬功能（KV、D1、R2）作為必要項目

## Decisions

### 1. 使用 OpenNext for Cloudflare
**決定**：採用 `@opennextjs/cloudflare` 作為 Next.js 到 Cloudflare Workers 的轉接層

**理由**：
- 專案已安裝（package.json:66）
- 支援 Next.js App Router 和 Server Components
- 自動處理 Edge Runtime 轉換
- 活躍維護和社群支援

**替代方案**：
- ❌ **手動遷移到 Cloudflare Pages Functions**：工程量大，維護困難
- ❌ **使用其他 adapter**：生態系統不成熟

### 2. 資料庫連線策略
**決定**：使用 `@neondatabase/serverless` + Supabase Pooler

**理由**：
- 已實作且經過測試（zeabur.ts）
- 支援 WebSocket 連線（Workers 友善）
- Supabase 官方支援

**配置**：
```typescript
// lib/db/zeabur.ts 已實作
const isCloudflareWorkers = typeof globalThis.caches !== 'undefined'

if (isCloudflareWorkers) {
  // 使用 Neon serverless + Supabase Pooler
  neonPool = new NeonPool({ connectionString: process.env.SUPABASE_POOLER_URL })
}
```

**環境變數需求**：
- `SUPABASE_POOLER_URL`：格式 `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

### 3. Cron Jobs 遷移
**決定**：使用 Cloudflare Cron Triggers

**Vercel 配置（現有）**：
```json
{
  "crons": [{
    "path": "/api/cron/exchange-rates",
    "schedule": "0 0 * * *"
  }]
}
```

**Cloudflare 配置（新）**：
```jsonc
// wrangler.jsonc
{
  "triggers": {
    "crons": ["0 0 * * *"]
  }
}
```

**程式碼調整**：
```typescript
// app/api/cron/exchange-rates/route.ts
export async function GET(request: Request) {
  // Cloudflare Cron 驗證
  const cronHeader = request.headers.get('cf-cron-event')
  if (cronHeader && process.env.NODE_ENV === 'production') {
    // Cron 觸發，不需 CRON_SECRET
  } else {
    // 手動觸發，需驗證 CRON_SECRET
  }
}
```

### 4. CI/CD 自動部署
**決定**：使用 GitHub Actions + Wrangler CLI

**工作流程**：
```yaml
# .github/workflows/cloudflare-deploy.yml
name: Deploy to Cloudflare
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy .open-next --project-name=quotation-system
```

**所需 GitHub Secrets**：
- `CLOUDFLARE_API_TOKEN`：從 Cloudflare Dashboard 建立
- `CLOUDFLARE_ACCOUNT_ID`：Cloudflare 帳戶 ID

### 5. 環境變數管理
**決定**：使用 Wrangler Secrets + .dev.vars

**本地開發**：
```bash
# .dev.vars（不提交到 Git）
SUPABASE_POOLER_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
# ... 其他環境變數
```

**生產環境**：
```bash
# 使用 wrangler secret
pnpm exec wrangler secret put SUPABASE_POOLER_URL
pnpm exec wrangler secret put GMAIL_APP_PASSWORD
# 批次設定腳本見 tasks.md
```

### 6. Build 配置
**決定**：確保不使用 Turbopack

**檢查**：
```json
// package.json - 必須確認
{
  "scripts": {
    "build": "next build"  // ✅ 正確
    // "build": "next build --turbopack"  // ❌ 錯誤，OpenNext 不支援
  }
}
```

**Next.js 配置**（已正確）：
```typescript
// next.config.ts
const nextConfig = {
  output: 'standalone',  // ✅ OpenNext 需要
  outputFileTracingRoot: path.join(__dirname),  // ✅ 避免路徑問題
}
```

## Risks / Trade-offs

### 風險 1: Next.js 15 相容性
**風險**：OpenNext 可能對 Next.js 15 的新功能支援不完整

**緩解措施**：
1. 本地測試 `pnpm run preview:cf` 驗證所有路由
2. 使用 Chrome DevTools 檢查前端錯誤
3. 測試 Server Actions（如有使用）
4. 保留 Vercel 部署作為回滾選項（30 天）

### 風險 2: Middleware 執行差異
**風險**：Cloudflare Workers 的 middleware 環境可能與 Vercel 不同

**緩解措施**：
1. 測試 next-intl middleware 的重定向邏輯
2. 驗證 Supabase SSR 的 cookie 處理
3. 檢查 CSRF 保護機制

**測試清單**：
- [ ] 語系切換（/zh、/en）
- [ ] 未認證重定向到登入頁
- [ ] Session cookie 讀寫
- [ ] CSRF token 驗證

### 風險 3: 冷啟動效能
**風險**：Workers 冷啟動可能比 Vercel 慢

**評估指標**：
- Vercel 冷啟動：~500ms
- Cloudflare Workers 冷啟動：預期 200-800ms

**監控**：
- 使用 Cloudflare Analytics 追蹤 TTFB
- 設定效能預算：P95 < 1s

### 風險 4: Email 發送可靠性
**風險**：Gmail SMTP 在 Workers 環境可能有連線問題

**緩解措施**：
1. 優先測試 Gmail SMTP（nodemailer）
2. 準備切換到 Resend API（Workers 友善）
3. 實作重試機制

## Migration Plan

### 階段一：本地驗證（預估 3 天）
1. **Day 1：建置測試**
   ```bash
   pnpm run preview:cf
   ```
   - 驗證所有頁面可正常載入
   - 檢查 console 無錯誤
   - 測試資料庫查詢

2. **Day 2：功能測試**
   - 登入/登出流程
   - 建立/編輯報價單
   - 客戶管理
   - 產品管理
   - Email 發送

3. **Day 3：邊緣案例測試**
   - 大量資料載入
   - 並發請求
   - 錯誤處理

### 階段二：設定 Cloudflare（預估 2 天）
1. **Day 1：基礎配置**
   - 建立 Cloudflare Pages 專案
   - 連接 GitHub repository
   - 設定環境變數

2. **Day 2：CI/CD**
   - 建立 GitHub Actions workflow
   - 測試自動部署
   - 驗證 Preview Deployments

### 階段三：Preview 部署測試（預估 2 天）
1. **功能驗證**
   - 完整使用者流程測試
   - Cron jobs 手動觸發測試
   - 資料庫連線穩定性測試

2. **效能測試**
   - 載入時間測試
   - API 回應時間測試
   - 並發請求測試

### 階段四：正式遷移（預估 1 天）
1. **部署到 Production**
   ```bash
   pnpm run deploy:cf
   ```

2. **DNS 設定**（如需自訂網域）
   - 更新 DNS CNAME 記錄
   - 等待 DNS 傳播（最多 24 小時）

3. **監控**
   - 觀察 Cloudflare Analytics
   - 檢查錯誤日誌
   - 驗證 Cron jobs 自動執行

### 回滾計劃
如遇重大問題：
1. **立即回滾**：將 DNS 指回 Vercel（5 分鐘）
2. **延遲回滾**：保留 Vercel 專案 30 天，可隨時切換
3. **資料庫回滾**：無需回滾（使用相同的 Supabase 資料庫）

## Open Questions

### Q1: 是否需要使用 Cloudflare D1 或 KV？
**答**：暫不需要。Supabase PostgreSQL 已足夠，且避免供應商綁定。

### Q2: 檔案上傳功能如何處理？
**答**：
- 如目前無檔案上傳功能，維持現狀
- 如未來需要，可使用 Cloudflare R2 或 Supabase Storage

### Q3: 是否保留 Vercel Preview Deployments？
**答**：Cloudflare Pages 也支援 Preview Deployments（每個 PR 自動建立），功能相當。

### Q4: 成本比較？
**估算**：
- **Vercel**：Hobby 免費版（有限制）或 Pro $20/月
- **Cloudflare Workers**：Free Plan 100K req/day 或 Paid $5/月（10M req/month）
- **節省**：每月約 $15（若目前使用 Vercel Pro）

### Q5: 需要修改多少程式碼？
**答**：
- 核心邏輯：0%（無需修改）
- 環境變數：100%（需全部重新設定）
- Cron jobs：1 個檔案（驗證邏輯微調）
- 總體：**影響範圍小於 5%**

## Success Criteria

部署成功的標準：
- ✅ 所有頁面可正常存取（200 狀態碼）
- ✅ 資料庫連線穩定（0 連線錯誤）
- ✅ Cron jobs 每日自動執行
- ✅ Email 發送成功率 > 99%
- ✅ P95 回應時間 < 1s
- ✅ GitHub push 後 5 分鐘內完成部署
- ✅ 零停機時間遷移

## Monitoring & Rollback

### 監控指標
1. **Cloudflare Analytics**
   - Requests per second
   - Error rate
   - Response time (P50, P95, P99)
   - Bandwidth usage

2. **自訂監控**（可選）
   - Sentry 錯誤追蹤
   - Cloudflare Workers Analytics Engine

### Rollback Triggers
如發生以下情況，立即回滾到 Vercel：
- 錯誤率 > 5%
- P95 回應時間 > 3s
- 資料庫連線失敗率 > 10%
- Cron jobs 連續失敗 3 次

## References

- [OpenNext Documentation](https://opennext.js.org/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Supabase Pooler Guide](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Next.js Deployment Docs](https://nextjs.org/docs/app/building-your-application/deploying)
