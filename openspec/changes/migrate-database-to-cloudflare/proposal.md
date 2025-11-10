# 資料庫遷移至 Cloudflare D1 + KV

## Why

當前系統存在多個關鍵問題需要解決：

1. **安全性風險**: Zeabur API Token 和資料庫密碼洩漏在 Git 歷史中，需要立即清理
2. **架構複雜性**: 同時使用 Zeabur PostgreSQL 和 Supabase PostgreSQL，造成維護困難和資料分散
3. **成本負擔**: 雙資料庫訂閱費用每月 $40-45，未充分利用 Cloudflare 免費額度
4. **效能瓶頸**: 每次 API 請求都需要 3-5 次資料庫查詢進行權限檢查，匯率查詢重複，響應時間達 150-200ms

## What Changes

採用 **Supabase Auth + Cloudflare D1 + Cloudflare KV** 三層混合架構：

- **認證層**: 保留 Supabase Auth（零改動）
- **資料層**: 遷移 17 張業務表到 Cloudflare D1（SQLite）
- **快取層**: 新增 Cloudflare KV 快取熱資料（匯率、權限、公司設定）

核心變更：

1. 遷移所有業務資料從 Supabase PostgreSQL 到 Cloudflare D1
2. 建立 KV 快取層減少資料庫查詢
3. 完全移除 Zeabur 依賴並清理洩漏的敏感資料
4. 建立統一的資料存取層（DAL）抽象

**預期收益**:
- **成本**: 降至 $0/月（100% 節省）
- **效能**: API 回應時間從 150-200ms 降至 80-100ms（改善 40-50%）
- **架構**: 單一平台（Cloudflare），全球邊緣部署

**BREAKING**: 資料庫底層從 PostgreSQL 改為 SQLite，需要重新設計查詢語法和處理 JSON 欄位

## Impact

### 受影響的 specs

- `database-integration` - **重大修改**: 從 Supabase PostgreSQL 改為 Cloudflare D1
- `cache-layer` - **新增**: Cloudflare KV 快取策略
- `security` - **修改**: 清理洩漏密鑰，改用 Cloudflare Workers Secrets

### 受影響的程式碼

- `lib/db/` - 完全重寫資料庫客戶端（移除 Supabase，新增 D1）
- `lib/dal/` - 新增：資料存取層（8 個實體）
- `lib/cache/` - 新增：KV 快取抽象層
- `lib/services/` - 更新：整合 D1 和 KV
- `app/api/**` - 更新：所有 API 路由（35+ 個檔案）
- `migrations/` - 新增：D1 schema 和資料遷移腳本
- `scripts/` - 移除：所有 Zeabur 相關腳本
- `.env` - 移除：ZEABUR_POSTGRES_URL，新增：D1 和 KV bindings

### 遷移風險

- **中等**: SQLite 功能限制（如 JSONB 操作符需在應用層處理）
- **低**: D1 並發寫入限制（使用樂觀鎖定和重試機制）
- **中等**: KV 最終一致性（寫入後 60 秒全球同步）
- **高**: 資料遷移錯誤（緩解：完整備份 + 多次測試 + 回滾計畫）

### 時間估算

- **總時間**: 40 小時（1-2 週）
- **優先級**: P0（安全性清理）+ P1（架構遷移）

### 回滾策略

保留 Supabase 資料 30 天，可在 5 分鐘內完全回滾到遷移前狀態。
