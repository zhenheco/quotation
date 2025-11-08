# Cloudflare 部署規格

## ADDED Requirements

### Requirement: Cloudflare Workers 部署支援
系統 SHALL 支援部署到 Cloudflare Workers/Pages 平台，使用 OpenNext adapter 作為轉接層。

#### Scenario: 成功部署到 Cloudflare Pages
- **GIVEN** 專案已配置 `output: 'standalone'` 和 `@opennextjs/cloudflare`
- **WHEN** 執行 `pnpm run deploy:cf`
- **THEN** 系統應成功建置並部署到 Cloudflare Pages
- **AND** 所有路由應可正常存取
- **AND** 部署日誌應無錯誤

#### Scenario: 本地預覽測試
- **GIVEN** 開發者已配置 `.dev.vars` 環境變數
- **WHEN** 執行 `pnpm run preview:cf`
- **THEN** 系統應在本地啟動 Cloudflare Workers 模擬環境
- **AND** 應可透過 localhost 存取應用程式
- **AND** 功能行為應與 Vercel 部署一致

### Requirement: Cloudflare Workers 環境資料庫連線
系統 SHALL 在 Cloudflare Workers 環境中使用 WebSocket-based Supabase Pooler 連線資料庫。

#### Scenario: 自動偵測 Cloudflare Workers 環境
- **GIVEN** 程式碼部署於 Cloudflare Workers
- **WHEN** 執行資料庫連線邏輯（`lib/db/zeabur.ts`）
- **THEN** 系統應偵測到 Cloudflare Workers 環境（`typeof globalThis.caches !== 'undefined'`）
- **AND** 應使用 `@neondatabase/serverless` 套件
- **AND** 應連線到 `SUPABASE_POOLER_URL`

#### Scenario: 資料庫查詢成功
- **GIVEN** Cloudflare Workers 環境已正確配置 `SUPABASE_POOLER_URL`
- **WHEN** 執行任何資料庫查詢（例如：登入、查詢客戶）
- **THEN** 查詢應成功執行並回傳資料
- **AND** 連線應使用 WebSocket 協定
- **AND** 不應有連線逾時錯誤

### Requirement: Cloudflare Cron Triggers 支援
系統 SHALL 支援使用 Cloudflare Cron Triggers 執行定期任務，取代 Vercel Cron。

#### Scenario: 每日匯率同步自動執行
- **GIVEN** `wrangler.jsonc` 配置 `triggers.crons: ["0 0 * * *"]`
- **WHEN** 到達每日 00:00 UTC
- **THEN** Cloudflare 應自動觸發 `/api/cron/exchange-rates`
- **AND** 請求 headers 應包含 `cf-cron-event`
- **AND** 匯率同步應成功執行

#### Scenario: 手動觸發 Cron Job（使用 secret）
- **GIVEN** 需要立即執行匯率同步
- **WHEN** 發送 GET 請求到 `/api/cron/exchange-rates` 並包含正確的 `x-cron-secret` header
- **THEN** 系統應驗證 secret 正確
- **AND** 應執行匯率同步
- **AND** 應回傳同步結果

#### Scenario: 未授權的 Cron 觸發請求
- **GIVEN** 非 Cloudflare Cron 且無 secret 的請求
- **WHEN** 嘗試存取 `/api/cron/exchange-rates`
- **THEN** 系統應回傳 401 Unauthorized
- **AND** 不應執行匯率同步

### Requirement: GitHub Actions 自動部署
系統 SHALL 支援透過 GitHub Actions 自動部署到 Cloudflare Pages。

#### Scenario: Push 到 main 分支自動部署
- **GIVEN** 已配置 `.github/workflows/cloudflare-deploy.yml`
- **WHEN** 提交程式碼到 `main` 分支
- **THEN** GitHub Actions 應自動觸發
- **AND** 應執行 `pnpm run build` 和 `opennextjs-cloudflare build`
- **AND** 應部署到 Cloudflare Pages
- **AND** 部署應在 5 分鐘內完成

#### Scenario: Pull Request 自動建立 Preview Deployment
- **GIVEN** 已配置 GitHub Actions workflow
- **WHEN** 建立 Pull Request
- **THEN** 系統應自動建立 Preview Deployment
- **AND** 應在 PR 評論中提供 Preview URL
- **AND** Preview 應使用獨立的環境

### Requirement: 環境變數安全管理
系統 SHALL 使用 Cloudflare Secrets 管理敏感環境變數。

#### Scenario: 設定 Secret 環境變數
- **GIVEN** 需要設定 `SUPABASE_POOLER_URL` 等敏感資料
- **WHEN** 執行 `pnpm exec wrangler secret put SUPABASE_POOLER_URL`
- **THEN** 系統應提示輸入值
- **AND** 值應加密儲存於 Cloudflare
- **AND** 應可在 Workers 中透過 `process.env.SUPABASE_POOLER_URL` 存取

#### Scenario: 列出已設定的 Secrets
- **GIVEN** 已設定多個 secrets
- **WHEN** 執行 `pnpm exec wrangler secret list --name quotation-system`
- **THEN** 系統應顯示所有 secret 名稱（不含值）
- **AND** 應顯示最後更新時間

### Requirement: Next.js 15 與 OpenNext 相容性
系統 SHALL 確保 Next.js 15 功能在 Cloudflare Workers 環境正常運作。

#### Scenario: App Router 路由正常運作
- **GIVEN** 專案使用 Next.js 15 App Router
- **WHEN** 存取任何路由（例如：`/zh/dashboard`, `/zh/customers`）
- **THEN** 路由應正確匹配
- **AND** Server Components 應正常渲染
- **AND** 不應有 404 錯誤

#### Scenario: Server Actions 正常執行（如有使用）
- **GIVEN** 表單使用 Server Actions（例如：登入、新增客戶）
- **WHEN** 提交表單
- **THEN** Server Action 應成功執行
- **AND** 應回傳正確的結果
- **AND** 不應有 runtime 錯誤

### Requirement: Middleware 相容性
系統 SHALL 確保 Next.js middleware 在 Cloudflare Workers 環境正常運作。

#### Scenario: next-intl 語系重定向
- **GIVEN** 使用者存取根路徑 `/`
- **WHEN** Middleware 執行
- **THEN** 應自動重定向到 `/zh` 或 `/en`（依瀏覽器語系）
- **AND** 重定向應為 307 Temporary Redirect

#### Scenario: Supabase SSR Cookie 處理
- **GIVEN** 使用者已登入
- **WHEN** Middleware 執行並讀取 Supabase session cookie
- **THEN** Session 應正確解析
- **AND** 未登入使用者應重定向到 `/login`
- **AND** Cookie 應正確寫回 response headers

### Requirement: 效能要求
系統 SHALL 在 Cloudflare Workers 環境中達到可接受的效能水準。

#### Scenario: 首頁 TTFB 小於 1 秒
- **GIVEN** 應用程式已部署到 Cloudflare
- **WHEN** 使用者存取首頁（`/zh`）
- **THEN** Time to First Byte (TTFB) 應小於 1 秒
- **AND** P95 回應時間應小於 1.5 秒

#### Scenario: 資料庫查詢回應時間
- **GIVEN** 執行客戶列表查詢
- **WHEN** 查詢資料庫並回傳結果
- **THEN** 整體 API 回應時間應小於 500ms
- **AND** 資料庫連線時間應小於 100ms

### Requirement: 錯誤處理與監控
系統 SHALL 在 Cloudflare 環境中提供適當的錯誤處理和監控。

#### Scenario: 資料庫連線失敗處理
- **GIVEN** Supabase Pooler 暫時無法連線
- **WHEN** 執行資料庫查詢
- **THEN** 系統應捕捉錯誤
- **AND** 應回傳友善的錯誤訊息給使用者
- **AND** 應記錄錯誤到 Cloudflare Logs

#### Scenario: 查看部署日誌
- **GIVEN** 需要除錯問題
- **WHEN** 前往 Cloudflare Dashboard → Workers & Pages → Logs
- **THEN** 應顯示即時的 console.log 和錯誤訊息
- **AND** 應可過濾和搜尋日誌

### Requirement: 回滾能力
系統 SHALL 支援快速回滾到先前的部署版本。

#### Scenario: 回滾到先前版本
- **GIVEN** 最新部署出現問題
- **WHEN** 在 Cloudflare Dashboard → Deployments 選擇先前版本並點擊 "Rollback"
- **THEN** 系統應在 1 分鐘內切換到先前版本
- **AND** 應無停機時間
- **AND** 先前版本應立即生效

## REMOVED Requirements

### Requirement: Vercel Cron Jobs
**理由**：改用 Cloudflare Cron Triggers

**遷移**：
- 移除 `vercel.json` 的 `crons` 配置
- 在 `wrangler.jsonc` 新增對應的 cron 設定
- 調整 cron API 路由的驗證邏輯

### Requirement: Vercel 環境變數
**理由**：改用 Cloudflare Secrets

**遷移**：
- 使用 `wrangler secret put` 重新設定所有環境變數
- 更新 `.env.local.example` 說明 Cloudflare 設定方式

## MODIFIED Requirements

### Requirement: 資料庫連線（Node.js vs Cloudflare Workers）
系統 SHALL 根據執行環境自動選擇適當的資料庫連線方式。

**變更**：新增 Cloudflare Workers 環境偵測和 Supabase Pooler 支援

#### Scenario: Node.js 環境（本地開發）
- **GIVEN** 執行於 Node.js 環境（`pnpm run dev`）
- **WHEN** 初始化資料庫連線
- **THEN** 應使用 `pg` 套件
- **AND** 應連線到 `SUPABASE_DB_URL`（Direct URL）
- **AND** 應建立連線池（max: 20）

#### Scenario: Cloudflare Workers 環境（Production）
- **GIVEN** 執行於 Cloudflare Workers（部署後）
- **WHEN** 初始化資料庫連線
- **THEN** 應使用 `@neondatabase/serverless` 套件
- **AND** 應連線到 `SUPABASE_POOLER_URL`（Pooler URL）
- **AND** 應啟用 WebSocket 模式
