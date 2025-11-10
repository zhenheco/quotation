# 實作任務清單

## 1. 緊急安全處理（優先級 P0）

- [x] 1.1 檢查 Git 歷史是否包含洩漏的密鑰
- [ ] 1.2 如發現洩漏，立即撤銷 Zeabur API Token （需要手動操作）
- [ ] 1.3 變更 Zeabur 資料庫密碼（如有必要） （評估後不需要，因為即將遷移）
- [x] 1.4 移除 .mcp.json 中的 ZEABUR_TOKEN
- [x] 1.5 移除 .claude/settings.local.json 中的 ZEABUR_TOKEN
- [x] 1.6 移除 scripts/setup-admin.js 中硬編碼的連接字串 （檢查後未發現）
- [ ] 1.7 清理 Git 歷史（使用 BFG Repo-Cleaner） （需要工具安裝）
- [x] 1.8 建立 .env.local.template 作為範例
- [ ] 1.9 強制推送清理後的歷史 （等待 1.7 完成）

## 2. Zeabur 完全清理

- [ ] 2.1 刪除 lib/db/zeabur.ts
- [ ] 2.2 刪除 lib/services/exchange-rate-zeabur.ts
- [ ] 2.3 更新 11 個引用 Zeabur 的 API 路由檔案
- [ ] 2.4 刪除 scripts/setup-zeabur-*.sh 腳本
- [ ] 2.5 刪除 scripts/check-zeabur-data.sh
- [ ] 2.6 移除測試中的 Zeabur mock
- [ ] 2.7 移動 Zeabur 文檔到 docs/archive/zeabur/
- [ ] 2.8 更新 .env.example 移除 ZEABUR_POSTGRES_URL

## 3. 建立 Cloudflare D1 資料庫

- [ ] 3.1 執行 `npx wrangler d1 create quotation-system-db`
- [ ] 3.2 建立 migrations/d1/001_initial_schema.sql
- [ ] 3.3 轉換 PostgreSQL schema 到 SQLite
  - [ ] UUID → TEXT
  - [ ] JSONB → TEXT
  - [ ] DECIMAL → REAL
  - [ ] TIMESTAMP → TEXT (ISO-8601)
  - [ ] 移除 REFERENCES auth.users
- [ ] 3.4 建立索引（user_id, created_at, 外鍵）
- [ ] 3.5 在本地測試 migration: `wrangler d1 execute --local --file=...`
- [ ] 3.6 部署到遠端: `wrangler d1 execute --remote --file=...`
- [ ] 3.7 驗證表結構

## 4. 建立 D1 客戶端抽象層

- [ ] 4.1 建立 lib/db/d1-client.ts
- [ ] 4.2 實作 D1Client.query<T>() 方法
- [ ] 4.3 實作 D1Client.queryOne<T>() 方法
- [ ] 4.4 實作 D1Client.execute() 方法
- [ ] 4.5 實作 D1Client.transaction() 方法
- [ ] 4.6 建立 getD1Client() 工廠函式
- [ ] 4.7 加入 TypeScript 型別定義

## 5. 建立資料存取層（DAL）

- [ ] 5.1 建立 lib/dal/customers.ts
- [ ] 5.2 建立 lib/dal/products.ts
- [ ] 5.3 建立 lib/dal/quotations.ts
- [ ] 5.4 建立 lib/dal/companies.ts
- [ ] 5.5 建立 lib/dal/contracts.ts
- [ ] 5.6 建立 lib/dal/payments.ts
- [ ] 5.7 建立 lib/dal/rbac.ts（角色與權限）
- [ ] 5.8 建立 lib/dal/exchange-rates.ts
- [ ] 5.9 為每個 DAL 定義 TypeScript interface
- [ ] 5.10 實作 JSON 欄位解析和序列化

## 6. 建立 KV 快取層

- [ ] 6.1 建立生產 KV namespace: `wrangler kv:namespace create "CACHE"`
- [ ] 6.2 建立測試 KV namespace: `wrangler kv:namespace create "CACHE" --preview`
- [ ] 6.3 更新 wrangler.jsonc 加入 kv_namespaces 配置
- [ ] 6.4 建立 lib/cache/kv-cache.ts
- [ ] 6.5 實作 KVCache.get<T>() 方法
- [ ] 6.6 實作 KVCache.set() 方法
- [ ] 6.7 實作 KVCache.delete() 方法
- [ ] 6.8 實作 KVCache.deleteMany() 方法
- [ ] 6.9 建立 getCached() 通用包裝器（Cache-Aside 模式）

## 7. 實作快取服務

- [ ] 7.1 建立 lib/services/exchange-rate-cached.ts
- [ ] 7.2 實作 getExchangeRate()（使用 KV 快取）
- [ ] 7.3 實作 syncExchangeRates()（同時更新 D1 和 KV）
- [ ] 7.4 建立 lib/services/rbac-cached.ts
- [ ] 7.5 實作 getUserPermissions()（使用 KV 快取）
- [ ] 7.6 實作 invalidateUserPermissions()
- [ ] 7.7 建立 lib/services/company-cached.ts
- [ ] 7.8 實作 getCompanyById()（使用 KV 快取）
- [ ] 7.9 更新所有寫入操作加入快取失效邏輯

## 8. 更新服務層

- [ ] 8.1 更新 lib/services/company.ts
- [ ] 8.2 更新 lib/services/rbac.ts
- [ ] 8.3 更新 lib/services/contracts.ts
- [ ] 8.4 更新 lib/services/analytics.ts
- [ ] 8.5 更新 lib/services/payments.ts
- [ ] 8.6 確保所有服務使用 D1Client 和 KVCache

## 9. 更新 API 路由

- [ ] 9.1 更新 app/api/customers/route.ts
- [ ] 9.2 更新 app/api/customers/[id]/route.ts
- [ ] 9.3 更新 app/api/products/route.ts
- [ ] 9.4 更新 app/api/products/[id]/route.ts
- [ ] 9.5 更新 app/api/quotations/route.ts
- [ ] 9.6 更新 app/api/quotations/[id]/route.ts
- [ ] 9.7 更新 app/api/quotations/[id]/pdf/route.ts
- [ ] 9.8 更新 app/api/companies/route.ts
- [ ] 9.9 更新 app/api/companies/[id]/route.ts
- [ ] 9.10 更新 app/api/companies/[id]/members/route.ts
- [ ] 9.11 更新 app/api/contracts/route.ts
- [ ] 9.12 更新 app/api/payments/route.ts
- [ ] 9.13 更新 app/api/exchange-rates/route.ts
- [ ] 9.14 更新 app/api/exchange-rates/sync/route.ts
- [ ] 9.15 更新 app/api/admin/stats/route.ts
- [ ] 9.16 更新 app/api/admin/users/route.ts
- [ ] 9.17 更新 app/api/admin/companies/route.ts
- [ ] 9.18 更新 app/api/admin/companies/[id]/members/route.ts
- [ ] 9.19 更新所有 API 使用 getUserPermissions()（KV 快取）
- [ ] 9.20 確保所有 API 有適當的錯誤處理

## 10. 資料遷移

- [ ] 10.1 從 Supabase 導出資料: `pg_dump --data-only`
- [ ] 10.2 建立 scripts/convert-pg-to-d1.ts
- [ ] 10.3 實作 PostgreSQL → SQLite 資料轉換
- [ ] 10.4 執行轉換產生 d1-data-import.sql
- [ ] 10.5 在本地 D1 測試導入
- [ ] 10.6 驗證資料完整性（記錄數比對）
- [ ] 10.7 導入到遠端 D1
- [ ] 10.8 再次驗證資料完整性

## 11. 環境變數配置

- [ ] 11.1 設定 Cloudflare Secrets（使用 wrangler secret put）
  - [ ] DATABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY
  - [ ] SUPABASE_DB_URL
  - [ ] EXCHANGE_RATE_API_KEY
  - [ ] GMAIL_USER
  - [ ] GMAIL_APP_PASSWORD
  - [ ] COMPANY_NAME
  - [ ] NEXT_PUBLIC_APP_URL
- [ ] 11.2 驗證環境變數: `wrangler secret list`
- [ ] 11.3 更新 .env.example 移除 Zeabur 變數
- [ ] 11.4 更新 .env.local.example 加入 D1/KV 說明

## 12. 測試

- [ ] 12.1 建立 D1 Mock: tests/mocks/d1.ts
- [ ] 12.2 建立 KV Mock: tests/mocks/kv.ts
- [ ] 12.3 更新 vitest.config.ts
- [ ] 12.4 撰寫 DAL 單元測試（8 個檔案）
- [ ] 12.5 撰寫快取服務測試
- [ ] 12.6 執行所有測試: `pnpm test`
- [ ] 12.7 本地整合測試（使用 D1 local）
- [ ] 12.8 測試所有 CRUD 操作
- [ ] 12.9 測試權限檢查（應用層）
- [ ] 12.10 測試 KV 快取命中/未命中
- [ ] 12.11 測試 PDF 生成
- [ ] 12.12 測試 OAuth 登入

## 13. 部署前檢查

- [ ] 13.1 執行 `npm run lint` 無錯誤
- [ ] 13.2 執行 `npm run typecheck` 無錯誤
- [ ] 13.3 執行 `npm run build` 成功
- [ ] 13.4 確認 next.config.ts 包含 `output: 'standalone'`
- [ ] 13.5 確認 wrangler.jsonc 配置正確
- [ ] 13.6 確認所有環境變數已設定
- [ ] 13.7 確認 D1 資料已導入
- [ ] 13.8 確認 KV namespace 已建立

## 14. 部署到測試環境

- [ ] 14.1 執行 `pnpm run build`
- [ ] 14.2 執行 `pnpm run deploy:cf`
- [ ] 14.3 測試部署 URL 是否正常
- [ ] 14.4 測試登入功能
- [ ] 14.5 測試 API 端點（使用 curl）
- [ ] 14.6 測試效能（回應時間）
- [ ] 14.7 檢查 Cloudflare Dashboard 日誌
- [ ] 14.8 執行負載測試（可選）

## 15. 生產部署

- [ ] 15.1 最後一次從 Supabase 導出資料
- [ ] 15.2 導入到生產 D1
- [ ] 15.3 驗證資料完整性
- [ ] 15.4 部署到生產環境
- [ ] 15.5 啟動即時日誌監控: `wrangler tail`
- [ ] 15.6 執行冒煙測試（所有主要功能）
- [ ] 15.7 驗證 API 回應時間 < 100ms
- [ ] 15.8 驗證 KV 快取命中率 > 80%
- [ ] 15.9 設定 Cloudflare 警報（錯誤率、延遲）
- [ ] 15.10 監控 30 分鐘確保穩定

## 16. 清理與文檔

- [ ] 16.1 保留 Supabase 業務資料 30 天（作為備份）
- [ ] 16.2 更新 README.md 說明新架構
- [ ] 16.3 建立 docs/CLOUDFLARE_MIGRATION_COMPLETE.md
- [ ] 16.4 記錄遷移過程中的問題和解決方案
- [ ] 16.5 建立回滾 SOP 文件
- [ ] 16.6 更新團隊文檔（如有）

## 17. 後續優化（可選）

- [ ] 17.1 分析 KV 快取命中率
- [ ] 17.2 調整 TTL 策略
- [ ] 17.3 加入 Analytics Engine 追蹤快取效能
- [ ] 17.4 優化 D1 查詢（新增索引）
- [ ] 17.5 實作查詢快取（如產品列表）
- [ ] 17.6 監控 D1 和 KV 用量
- [ ] 17.7 30 天後確認穩定，清理 Supabase 業務表
