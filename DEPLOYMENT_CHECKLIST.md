# Cloudflare Workers 部署檢查清單

## 部署前準備

### 代碼完整性檢查
- [x] 修復 API 路由 Supabase 客戶端初始化
- [x] `pnpm run build` 成功完成
- [x] 無 TypeScript 編譯錯誤
- [x] 構建輸出包含 `.open-next/` 目錄
- [x] 資料庫查詢包含必需的 `customer_email` 欄位

### 環境變數準備
確保已在 Cloudflare Workers Secrets 中設定:
- [ ] `SUPABASE_POOLER_URL` - Neon Serverless 連接池
- [ ] `SUPABASE_DB_URL` - 直接資料庫連接（備用）
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase 專案 URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 匿名金鑰
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服務角色金鑰

**設定環境變數命令:**
```bash
npx wrangler secret put SUPABASE_POOLER_URL --env production
npx wrangler secret put SUPABASE_DB_URL --env production
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL --env production
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY --env production
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
```

### Wrangler 認證
- [ ] 已登入 Cloudflare: `npx wrangler login`
- [ ] 帳戶與 quotation-system Worker 一致
- [ ] API Token 有效（驗證: `npx wrangler whoami`）

### 配置文件驗證
- [x] `wrangler.jsonc` 包含 `nodejs_compat` 標誌
- [x] `next.config.ts` 包含 `output: 'standalone'`
- [x] `next.config.ts` 包含 `outputFileTracingRoot`
- [x] `open-next.config.ts` 存在（可選）

## 部署執行

### 第一步: 本地構建驗證
```bash
# 清潔構建
rm -rf .next .open-next
pnpm install

# 構建
pnpm run build
```

**檢查項目:**
- [ ] 無編譯錯誤
- [ ] `.next/standalone` 目錄存在
- [ ] `.open-next/worker.js` 存在

### 第二步: 本地預覽測試（可選但推薦）
```bash
# 本地預覽
pnpm run preview:cf
```

**測試項目:**
- [ ] http://localhost:8787  可訪問
- [ ] 首頁加載正常
- [ ] 登入流程可用
- [ ] API 端點可訪問 (http://localhost:8787/api/quotations)

### 第三步: 部署到 Cloudflare
```bash
# 部署
pnpm run deploy:cf
```

**輸出應包含:**
```
✓ Uploaded 123 files
✓ Deployed to https://quotation-system.your-subdomain.workers.dev
```

### 第四步: 部署驗證

#### A. 檢查部署狀態
```bash
# 查看最近部署
npx wrangler deployments list quotation-system

# 查看目前部署
npx wrangler deployments list quotation-system --limit 1
```

#### B. 檢查即時日誌
```bash
# 啟用日誌監控（開啟此終端保持開啟）
npx wrangler tail quotation-system --format pretty
```

#### C. 測試 API 端點（在另一個終端）

**測試首頁:**
```bash
curl -i https://quotation-system.your-subdomain.workers.dev/
```
期望: 200 OK 或 307 重定向

**測試登入頁面:**
```bash
curl -i https://quotation-system.your-subdomain.workers.dev/login
```
期望: 200 OK

**測試認證 API 端點:**
```bash
# 需要有效的 auth token
curl -i -H "Authorization: Bearer YOUR_TOKEN" \
  https://quotation-system.your-subdomain.workers.dev/api/me
```
期望: 200 OK 或 401 Unauthorized（無有效 token）

**測試報價單 API:**
```bash
curl -i -H "Authorization: Bearer YOUR_TOKEN" \
  https://quotation-system.your-subdomain.workers.dev/api/quotations
```
期望: 200 OK 或 401 Unauthorized

#### D. Cloudflare 儀表板檢查
1. 前往 https://dash.cloudflare.com
2. Workers & Pages > quotation-system
3. 檢查項目:
   - [ ] Deployments 顯示最新部署
   - [ ] Logs 顯示請求日誌
   - [ ] Environment 顯示已設定的 secrets
   - [ ] Settings 顯示正確配置

## 部署後驗證

### 功能測試
- [ ] 用戶可以登入
- [ ] 報價單列表加載正常
- [ ] 可以查看單一報價單詳情
- [ ] 可以建立新報價單
- [ ] 可以更新報價單
- [ ] 可以刪除報價單
- [ ] 可以寄送報價單

### 性能檢查
- [ ] 首頁加載時間 < 2秒
- [ ] API 響應時間 < 500ms
- [ ] 沒有 Worker 超時錯誤

### 安全檢查
- [ ] 認證令牌正確驗證
- [ ] 未授權請求返回 401
- [ ] 敏感信息未在日誌中洩露
- [ ] HTTPS 連接強制

### 錯誤日誌檢查
```bash
# 檢查日誌中的錯誤
npx wrangler tail quotation-system | grep -i error
```

- [ ] 沒有資料庫連接錯誤
- [ ] 沒有認證錯誤
- [ ] 沒有中間件錯誤

## 回滾程序

如果部署有問題，可以回滾到先前版本:

```bash
# 查看部署歷史
npx wrangler deployments list quotation-system

# 回滾到指定版本（使用 deployment ID）
npx wrangler rollback --version-id <deployment-id> quotation-system
```

## 部署問題排查

### 常見錯誤及解決方案

#### 500 Internal Server Error
```
日誌: "Database connection failed"
原因: 環境變數未正確設定
解決: 重新設定 SUPABASE_POOLER_URL
```

#### 401 Unauthorized on all endpoints
```
日誌: "Failed to get user from auth"
原因: Supabase 金鑰無效
解決: 驗證 NEXT_PUBLIC_SUPABASE_ANON_KEY
```

#### 404 on /zh/quotations
```
日誌: "Route not found"
原因: i18n 中間件配置
解決: 檢查 middleware.ts 的語言路由設定
```

#### Timeout (30秒)
```
日誌: "Request timed out"
原因: 資料庫查詢緩慢
解決: 檢查 Neon 連接狀態，優化查詢
```

#### Build artifact not found
```
錯誤: ".open-next/worker.js not found"
原因: 構建失敗
解決:
1. npm run build
2. 檢查是否有 TypeScript 錯誤
3. 驗證 wrangler.jsonc 配置
```

## 部署完成確認

部署成功標誌:
- [x] 代碼已修復並構建通過
- [ ] 環境變數已設定
- [ ] 部署已完成
- [ ] API 端點可訪問
- [ ] 認證流程正常
- [ ] 資料庫查詢返回正確數據
- [ ] 即時日誌無錯誤

## 後續維護

### 日常監控
- 每日檢查 Cloudflare 儀表板
- 監控請求率和錯誤率
- 檢查資料庫性能

### 定期維護
- 每週檢查依賴更新
- 每月檢查安全漏洞
- 每季度優化性能

### 更新部署流程
當有代碼變更時:
```bash
git checkout -b feature/new-feature
# 進行修改和測試
pnpm run build
pnpm run preview:cf  # 本地測試
git push origin feature/new-feature
# 建立 PR 並獲得審核
git checkout deployment
git pull origin main
pnpm run deploy:cf
```

---

**最後更新**: 2025-11-02
**維護人員**: Development Team
**聯繫**: 如有部署問題，查看 DEPLOYMENT_SUMMARY.md
