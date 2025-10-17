# 變更日誌 | Changelog

本文件記錄報價單系統的所有重要變更。

格式基於 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)，
版本號遵循 [語義化版本](https://semver.org/lang/zh-TW/)。

---

## [Unreleased]

### 🔧 Fixed (修復中)
- **權限錯誤修復** - permission denied for table customers/products/quotations
  - 創建 Supabase 資料庫遷移腳本 `supabase-migrations/001_initial_schema.sql`
  - 統一使用 Supabase 作為主要資料庫（認證 + 業務數據）
  - 架構調整：Zeabur PostgreSQL 僅用於匯率數據

### 📝 Added (新增)
- 📄 `docs/SUPABASE_MIGRATION_GUIDE.md` - 完整的遷移執行指南
- 📄 `QUICK_FIX.md` - 快速修復指南（5分鐘解決方案）
- 📄 `scripts/run-supabase-migration.ts` - 自動執行遷移腳本（備用）

### 🔄 Changed (變更)
- 業務表結構優化：修正欄位名稱以匹配實際代碼使用
  - `products.base_price` → `products.unit_price`
  - `quotations.total` → `quotations.total_amount`
  - 新增 `products.sku`, `customers.tax_id`, `customers.contact_person`
- 簡化 `quotation_items` 表結構，移除未使用欄位

### 待優化項目
- [ ] 修復批次匯出的 N+1 查詢問題 (21次查詢→2次)
- [ ] 實作錯誤追蹤系統 (Sentry/OpenTelemetry)
- [ ] 添加環境變數驗證 (lib/env.ts)
- [ ] 實作 Cron Job 冪等性保證
- [ ] 執行測試套件達到 80% 覆蓋率

---

## [0.6.1] - 2025-10-17

### 🎨 UI/UX Improvements (介面優化) ✅

#### 側邊欄可收合功能
- **Sidebar 組件重構** (`components/Sidebar.tsx`)
  - 新增收合/展開切換功能
  - 動態寬度調整：64px（收合）↔ 256px（展開）
  - 收合按鈕位於右側邊緣，帶箭頭圖示
  - 收合時顯示懸停提示（Tooltip）
  - 平滑過渡動畫（transition-all duration-300）
  - 保持圖示可見，文字動態顯示/隱藏

#### 導航欄簡化
- **Navbar 組件優化** (`components/Navbar.tsx`)
  - 移除左側系統名稱/Logo
  - 採用靠右對齊佈局（justify-end）
  - 保留語言切換和登出按鈕
  - 清理未使用的 Link import

### 🛠️ Development Tools (開發工具) ✅

#### 測試數據建立工具
1. **TypeScript 腳本** (`scripts/create-test-data.ts`)
   - 直接連接 Zeabur PostgreSQL 建立測試數據
   - 使用 pg 客戶端連接池
   - 支援命令列傳入 User ID
   - 交易式操作保證數據一致性
   - 完整的錯誤處理和回滾機制
   - 建立內容：
     - 5 個測試客戶（涵蓋台灣、美國市場）
     - 10 個測試產品（電腦週邊、辦公用品）
     - 5 個測試報價單（各種狀態：draft/sent/accepted/rejected）
     - 13 個報價單項目
   - 支援重複執行（ON CONFLICT 處理）

2. **開發環境啟動腳本** (`scripts/dev.sh`)
   - 環境變數檢查
   - 依賴安裝檢查
   - 自動啟動開發伺服器
   - 清晰的錯誤提示

3. **完整使用指南** (`docs/CREATE_TEST_DATA.md`)
   - 詳細的步驟說明
   - User ID 獲取方法（瀏覽器 Console）
   - 故障排除指南
   - 測試數據詳細列表

### 📊 Test Data Details (測試數據詳情)

#### 客戶 (5個)
1. 台灣科技股份有限公司 - 台北（含統編）
2. 優質貿易有限公司 - 新竹（含統編）
3. 創新設計工作室 - 台中
4. 全球物流企業 - 高雄（含統編）
5. 美國進口商公司 - 舊金山

#### 產品 (10個)
- 筆記型電腦 (TWD 35,000)
- 無線滑鼠 (TWD 800)
- 機械式鍵盤 (TWD 2,500)
- 27吋 4K 顯示器 (TWD 12,000)
- 網路攝影機 (TWD 1,500)
- 外接硬碟 1TB (TWD 1,800)
- 多功能印表機 (TWD 8,500)
- 辦公椅 (TWD 4,500)
- 電腦包 (TWD 1,200)
- USB 集線器 (TWD 600)

#### 報價單 (5個)
1. **Q2025-001** - Draft - TWD 51,450
2. **Q2025-002** - Sent - TWD 27,825
3. **Q2025-003** - Accepted - TWD 40,320
4. **Q2025-004** - Sent - USD 1,512
5. **Q2025-005** - Rejected - TWD 15,750

### Added (新增)
- 📁 `scripts/create-test-data.ts` - 測試數據建立腳本
- 📁 `scripts/dev.sh` - 開發環境啟動腳本
- 📁 `docs/CREATE_TEST_DATA.md` - 測試數據建立指南
- 📁 `app/api/seed-test-data/route.ts` - API 端點（備用方案）

### Changed (變更)
- 🎨 `components/Sidebar.tsx` - 新增可收合功能
- 🎨 `components/Navbar.tsx` - 移除頁面標題，簡化佈局
- 📝 `CHANGELOG.md` - 更新本次變更記錄

### Technical Details (技術細節)
- **測試數據工具**
  - 直接使用 pg 客戶端連接 Zeabur PostgreSQL
  - 不依賴 Supabase CLI
  - 支援跨平台執行（macOS、Linux、Windows）
  - UUID 預設值確保數據一致性

- **UI 動畫**
  - Tailwind CSS transition utilities
  - Transform 動畫（rotate-180）
  - Opacity 和 visibility 控制
  - Z-index 層級管理

### 📊 Statistics (統計)
- 新增檔案：4 個
- 修改檔案：3 個
- 新增代碼行數：~600 行
- UI 組件優化：2 個
- 文檔頁數：1 個（50+ 行）

---

## [0.6.0] - 2025-10-16

### 🔒 Security Fixes (安全性修復) ✅

#### 關鍵安全漏洞修復
1. **移除硬編碼資料庫密碼** 🔴 CRITICAL
   - 修復檔案: `lib/db/zeabur.ts`, `scripts/setup-zeabur-db.ts`
   - 移除硬編碼的 PostgreSQL 連線字串
   - 加入環境變數驗證和錯誤提示
   - 實作密碼遮罩功能於 log 輸出
   - 生產環境啟用 SSL 連線

2. **Email 格式驗證** 🟡 HIGH
   - 修復檔案: `app/api/quotations/[id]/email/route.ts`
   - 加入 Email 格式正則驗證
   - CC 副本 Email 驗證
   - 限制 CC 數量最多 10 個防止濫用

3. **API 速率限制實作** 🟡 HIGH
   - 新增檔案: `lib/middleware/rate-limiter.ts`
   - 5 種預設速率限制配置：
     - Email 發送：20 封/小時
     - 批次操作：5 次/5 分鐘
     - 匯率同步：10 次/小時
     - 一般 API：60 次/分鐘
     - 敏感操作：10 次/分鐘
   - 套用到所有關鍵 API 端點

4. **環境變數範例檔案**
   - 新增檔案: `.env.local.example`
   - 包含所有必要環境變數
   - 安全警告和說明文件

### 🧪 Testing Implementation (測試實作) ✅

#### 測試套件建立 (127 個測試案例)
1. **單元測試實作** (`tests/unit/`)
   - `email-api.test.ts` - Email API 測試 (25 個測試)
   - `analytics.test.ts` - 分析服務測試 (20 個測試)
   - `batch-operations.test.ts` - 批次操作測試 (30 個測試)
   - `exchange-rates.test.ts` - 匯率服務測試 (35 個測試)
   - `rate-limiter.test.ts` - 速率限制器測試 (17 個測試)

2. **測試環境設置**
   - `tests/setup.ts` - Vitest 測試環境
   - `tests/mocks/supabase.ts` - Supabase Mock
   - `vitest.config.ts` - Vitest 配置
   - `scripts/tests/run-all-tests.sh` - 測試運行腳本

3. **測試文檔** (`docs/`)
   - `TEST_REPORT.md` - 完整測試報告
   - `TESTING_STRATEGY.md` - 測試策略文檔
   - `TESTING_QUICKSTART.md` - 快速開始指南
   - `TEST_IMPLEMENTATION_SUMMARY.md` - 實作摘要
   - `README_TESTING.md` - 測試總覽

4. **測試工具鏈**
   ```json
   {
     "vitest": "^3.2.4",
     "@vitest/ui": "^3.2.4",
     "@vitest/coverage-v8": "^3.2.4",
     "@testing-library/react": "^16.0.1",
     "@testing-library/user-event": "^14.5.2",
     "msw": "^2.3.1",
     "supertest": "^6.3.3",
     "jsdom": "^26.0.0"
   }
   ```

### Added (新增)
- 📁 `lib/middleware/rate-limiter.ts` - API 速率限制中間件
- 📁 `.env.local.example` - 環境變數範例檔案
- 📁 `tests/` - 完整測試套件目錄
- 📁 `docs/TEST*.md` - 5 個測試相關文檔

### Changed (變更)
- 🔧 `lib/db/zeabur.ts` - 移除硬編碼密碼，加入驗證
- 🔧 `scripts/setup-zeabur-db.ts` - 移除硬編碼密碼
- 🔧 `app/api/quotations/[id]/email/route.ts` - 加入 Email 驗證和速率限制
- 🔧 `app/api/quotations/batch/*/route.ts` - 套用批次操作速率限制
- 🔧 `app/api/exchange-rates/sync/route.ts` - 套用同步速率限制
- 🔧 `package.json` - 新增測試腳本和依賴

### Security (安全性)
- ✅ 移除所有硬編碼敏感資訊
- ✅ 實作 Email 輸入驗證
- ✅ 實作 API 速率限制防護
- ✅ 加入環境變數驗證
- ✅ 密碼遮罩於日誌輸出
- ✅ 生產環境 SSL 連線

### 📊 Statistics (統計)
- 安全漏洞修復：4 個關鍵問題
- 測試案例數量：127 個
- 新增檔案：15+ 個
- 修改檔案：8 個
- 新增代碼行數：~2,500 行（含測試）
- 測試覆蓋目標：80%

---

## [0.5.0] - 2025-10-16

### 🎉 Major Features - Four-Phase Development Complete

#### Phase 1: Email 發送功能 ✅
- **整合 Resend Email 服務**
  - 安裝 `resend@^4.7.0` 和 `@react-email/components@^0.0.31`
  - 設定環境變數 `RESEND_API_KEY` 和 `EMAIL_FROM`

- **Email 模板系統** (`lib/email/`)
  - `QuotationEmailTemplate.tsx` - 中英文雙語 Email 模板
  - 使用 React Email 組件實現響應式設計
  - 完整顯示報價單明細、金額、稅金、總計
  - `service.ts` - Email 發送服務模組

- **發送報價單 API** (`app/api/quotations/[id]/email/route.ts`)
  - POST endpoint 發送報價單 Email
  - 支援 CC 副本收件人 (最多10人)
  - 自動更新報價單狀態為「已發送」
  - 權限驗證確保只能發送自己的報價單

- **UI 整合** (`components/EmailSendButton.tsx`)
  - 彈窗式發送介面
  - 支援選擇收件人、CC 副本、語言
  - Loading 狀態與錯誤處理
  - 成功後自動刷新頁面

#### Phase 2: 進階圖表分析 ✅
- **整合 Recharts 圖表庫** (`recharts@^2.15.0`)

- **三大圖表組件** (`components/charts/`)
  - `RevenueChart.tsx` - 營收趨勢線圖
    - 雙 Y 軸顯示營收與報價單數量
    - 6個月歷史數據趨勢
    - 自訂工具提示 (Tooltip)
  - `CurrencyChart.tsx` - 幣別分布圓餅圖
    - 顯示各貨幣佔比百分比
    - 彩色區塊與圖例
    - 顯示金額與數量統計
  - `StatusChart.tsx` - 狀態統計長條圖
    - 草稿/已發送/已接受/已拒絕分佈
    - 顯示數量與價值雙指標

- **Analytics 服務模組** (`lib/services/analytics.ts`)
  - `getRevenueTrend()` - 獲取月度營收趨勢
  - `getCurrencyDistribution()` - 計算幣別分布
  - `getStatusStatistics()` - 分析狀態統計
  - `getDashboardSummary()` - 提供儀表板摘要數據
    - 月度營收對比 (MoM Growth)
    - 轉換率計算 (已接受/已發送)
    - 待處理報價單統計

- **儀表板重構** (`app/[locale]/dashboard/page.tsx`)
  - 整合所有圖表到統一頁面
  - 新增統計卡片 (月營收、月報價單、轉換率、待處理)
  - 成長指標視覺化 (↑/↓ 百分比)
  - 快速操作區塊保留

#### Phase 3: 批次操作功能 ✅
- **多選功能實作**
  - 全選/取消全選 checkbox
  - 個別項目選擇
  - 選中計數顯示
  - 批次操作按鈕組

- **批次刪除 API** (`app/api/quotations/batch/delete/route.ts`)
  - 批次刪除多個報價單
  - 自動清理關聯的 quotation_items
  - 權限驗證確保只能刪除自己的資料

- **批次更新狀態 API** (`app/api/quotations/batch/status/route.ts`)
  - 批次更新報價單狀態
  - 支援 draft/sent/accepted/rejected
  - 記錄更新時間戳記

- **批次匯出 PDF** (`app/api/quotations/batch/export/route.ts`)
  - 整合 `jszip@^3.10.1` 生成 ZIP 檔案
  - 最多支援 20 份報價單同時匯出
  - 每個報價單生成獨立 PDF
  - 打包下載為 `quotations_YYYY-MM-DD.zip`

- **UI 整合** (`app/[locale]/quotations/QuotationList.tsx`)
  - 批次操作模式切換按鈕
  - 批次操作工具列 (更新狀態/匯出/刪除)
  - 確認對話框防止誤操作
  - 處理中狀態指示

#### Phase 4: 匯率自動更新機制 ✅
- **Vercel Cron Job 架構** (`vercel.json`)
  ```json
  {
    "crons": [{
      "path": "/api/cron/exchange-rates",
      "schedule": "0 0 * * *"  // 每日 UTC 00:00
    }]
  }
  ```

- **自動同步端點** (`app/api/cron/exchange-rates/route.ts`)
  - GET endpoint 供 Vercel Cron 調用
  - 同步所有 5 種支援貨幣 (TWD, USD, EUR, JPY, CNY)
  - 重試機制 (最多3次)
  - 執行時間限制 60 秒
  - CRON_SECRET 驗證防止未授權調用

- **錯誤通知機制**
  - Webhook 整合 (Slack/Discord)
  - 環境變數配置:
    - `ERROR_WEBHOOK_URL` - 錯誤通知
    - `SUCCESS_WEBHOOK_URL` - 成功通知 (僅生產環境)
  - 詳細錯誤訊息與時間戳記

- **手動同步增強** (`app/api/exchange-rates/sync/route.ts`)
  - 新增 `syncAll` 參數批次同步所有貨幣
  - POST 測試端點方便開發調試
  - 返回詳細同步結果

### 🌐 國際化更新
- **Email 相關** (messages/[locale].json)
  - `sendQuotation` - 發送報價單
  - `recipient` - 收件人
  - `cc` - 副本
  - `addCc` - 新增副本收件人
  - `language` - 郵件語言
  - `sending` - 發送中...
  - `sendSuccess` - 報價單已成功發送
  - `sendFailed` - 發送失敗，請稍後再試

- **圖表相關**
  - `monthlyRevenue` - 本月營收
  - `monthlyQuotations` - 本月報價單
  - `conversionRate` - 轉換率
  - `vsLastMonth` - 對比上月
  - `revenueTitle` - 營收趨勢分析
  - `currencyTitle` - 幣別分布
  - `statusTitle` - 報價單狀態統計

- **批次操作相關**
  - `selectMultiple` - 批次操作
  - `cancel` - 取消批次
  - `updateStatus` - 更新狀態
  - `exportPDF` - 匯出 PDF
  - `delete` - 批次刪除
  - `deleteConfirm.title` - 確認批次刪除
  - `deleteConfirm.description` - 您確定要刪除所選的 {{count}} 個報價單嗎？

### 📦 Dependencies Added
```json
{
  "resend": "^4.7.0",
  "@react-email/components": "^0.0.31",
  "recharts": "^2.15.0",
  "jszip": "^3.10.1",
  "@types/jszip": "^3.4.1"
}
```

### 🔒 Security Notes (From Code Review)
- ⚠️ **CRITICAL**: 硬編碼資料庫密碼需立即移除
- ⚠️ 缺少 Email 格式驗證
- ⚠️ 批次操作缺少速率限制
- ⚠️ 環境變數未驗證

### 📊 Statistics
- 新增檔案: 24 個
- 修改檔案: 8 個
- 新增代碼行數: ~1,455 行
- API 端點: 7 個新增
- UI 組件: 8 個新增

---

## [0.3.0] - 2025-10-16

### 🎉 Major Feature (主要功能)
- **PDF 匯出功能（雙語支援）**
  - 使用 @react-pdf/renderer 生成專業報價單 PDF
  - 支援中文、英文及雙語並列三種輸出模式
  - 響應式設計,支援 A4 列印格式
  - 完整的報價單資訊展示（客戶、產品、金額、稅金等）

### Added (新增)
- 📄 **PDF 模板系統** (`lib/pdf/`)
  - `QuotationPDFTemplate.tsx` - React PDF 模板組件
  - `types.ts` - PDF 資料類型定義
  - `translations.ts` - PDF 雙語翻譯文本
  - 支援自定義樣式和排版

- 🔌 **PDF 生成 API** (`app/api/quotations/[id]/pdf/route.ts`)
  - GET `/api/quotations/[id]/pdf?locale=zh&both=false`
  - 參數: locale (zh/en), both (true/false)
  - 串流式 PDF 輸出,提升效能
  - 完整的權限驗證與錯誤處理

- 🎨 **PDF 下載按鈕組件** (`components/PDFDownloadButton.tsx`)
  - 支援三種下載模式（中文/英文/雙語）
  - 下拉選單選擇語言
  - 下載進度指示器
  - 可自訂樣式變體 (primary/secondary/outline)

- 🌐 **翻譯更新**
  - 新增 PDF 相關翻譯鍵值
  - `downloadPDF`, `downloadChinesePDF`, `downloadEnglishPDF`, `downloadBilingualPDF`
  - `downloading` 狀態文本

### Changed (變更)
- 🎯 **報價單詳情頁面** (`app/[locale]/quotations/[id]/QuotationDetail.tsx`)
  - 整合 PDF 下載按鈕
  - 優化標題區域佈局

### Dependencies (依賴更新)
- ➕ 新增 `@react-pdf/renderer` - PDF 生成核心庫

### 技術細節
- PDF 採用 React 組件式開發,易於維護和擴展
- 支援未來添加公司 Logo、簽名等進階功能
- 完全響應式設計,適合列印和電子分享

---

## [0.2.1] - 2025-10-16

### 🔥 Critical Fix (重大修復)
- **修復混合雲架構中的資料庫連接問題**
  - 問題: 應用使用 Supabase 客戶端存取 Zeabur PostgreSQL,導致權限錯誤
  - 解決: 建立專用的 Zeabur PostgreSQL 客戶端連接池
  - 影響: exchange_rates 表的所有 CRUD 操作

### Added (新增)
- 📦 **Zeabur PostgreSQL 客戶端** (`lib/db/zeabur.ts`)
  - 獨立的 pg 連接池管理
  - 支援事務操作
  - 錯誤處理與連接超時控制
  - 環境變數配置支援

- 💱 **匯率服務 Zeabur 版本** (`lib/services/exchange-rate-zeabur.ts`)
  - 直接連接 Zeabur PostgreSQL
  - 完整的 CRUD 操作(INSERT/SELECT/UPDATE)
  - ON CONFLICT 處理避免重複資料
  - 與原 Supabase 版本並存

- 🛠️ **資料庫設定工具**
  - `zeabur-schema.sql` - 標準 PostgreSQL schema(不含 Supabase 特性)
  - `scripts/setup-zeabur-db.ts` - 自動化資料庫初始化腳本
  - 支援 UUID extension 啟用
  - 權限自動授予

### Changed (變更)
- 🔧 **API Routes 重構**
  - `GET /api/exchange-rates` - 改用 Zeabur PostgreSQL 查詢
  - `POST /api/exchange-rates/sync` - 改用 Zeabur PostgreSQL 儲存
  - 移除 Supabase 客戶端依賴
  - **預設基準貨幣改為 TWD** (原為 USD)

- 📦 **依賴新增**
  - `pg@^8.16.3` - PostgreSQL 客戶端
  - `@types/pg@^8.15.5` - TypeScript 類型定義

- 🛠️ **MCP 配置清理**
  - 移除 postgres MCP server (使用 pg 客戶端直連)
  - zeabur MCP 保留作為備選方案

### Fixed (修復)
- 🐛 **權限錯誤 (42501)**: "permission denied for table exchange_rates"
  - 根因: Supabase RLS 政策使用 `authenticated` 角色,但 Zeabur PostgreSQL 是標準資料庫
  - 解法: 直接使用 pg 客戶端連接,跳過 RLS 檢查

- 🐛 **資料表不存在**: Zeabur PostgreSQL 初始為空白資料庫
  - 解法: 建立 `setup-zeabur-db.ts` 自動初始化 schema

- 🐛 **架構混淆**: 開發過程中誤認為 Supabase 和 Zeabur 是同一套系統
  - 解法: 明確區分兩個資料庫的用途與連接方式

### Technical Details (技術細節)
- **Zeabur PostgreSQL**
  - 連接字串: `postgresql://root:***@43.159.54.250:30428/zeabur`
  - 連接池大小: 20
  - 連接超時: 2 秒
  - 閒置超時: 30 秒

- **架構優化**
  - Supabase: 純認證用途(auth.users)
  - Zeabur PostgreSQL: 業務資料儲存(exchange_rates 等)
  - 兩個資料庫完全獨立運作

### Migration Notes (遷移說明)
- ✅ 新專案: 執行 `npx tsx scripts/setup-zeabur-db.ts` 初始化資料庫
- ✅ 現有專案: 匯率功能已自動切換到 Zeabur PostgreSQL
- ⚠️  舊版 `lib/services/exchange-rate.ts` 保留但不再使用

### Testing Results (測試結果)
```bash
# 同步測試
POST /api/exchange-rates/sync
✅ 成功同步 4 筆匯率資料 (USD → TWD, EUR, JPY, CNY)

# 查詢測試
GET /api/exchange-rates?base=USD
✅ 返回完整匯率對照表

# 資料庫驗證
SELECT * FROM exchange_rates;
✅ 4 筆記錄,rate 精度正確 (DECIMAL 10,6)
```

### Breaking Changes (破壞性變更)
- ⚠️  匯率 API 內部實作完全變更(但 API 介面保持不變)
- ⚠️  不再需要 Supabase RLS migration

---

## [0.2.0] - 2025-10-16

### 🏗️ Architecture (架構說明)
- **混合雲架構設計**
  - Supabase Cloud: 認證系統 (Google OAuth)
  - PostgreSQL on Zeabur: 主要資料庫 (Self-hosted)
  - ExchangeRate-API: 匯率服務
- **完整架構文檔**: `docs/ARCHITECTURE.md`
- **README.md 更新**: 清楚說明混合架構與配置方式

### Added (新增)
- 💱 **匯率整合功能** (Phase 4.1)
  - ExchangeRate-API 整合 (v6 API)
  - 支援 5 種貨幣: TWD, USD, EUR, JPY, CNY
  - 匯率服務模組 (`lib/services/exchange-rate.ts`)
    - 從 API 獲取即時匯率
    - 資料庫快取機制
    - 貨幣轉換計算函數
    - 格式化顯示函數
  - API Routes:
    - `GET /api/exchange-rates` - 獲取最新匯率
    - `POST /api/exchange-rates/sync` - 手動同步匯率
  - Middleware 修復: `/api` 路徑跳過 i18n 處理
  - 環境變數配置 (`EXCHANGE_RATE_API_KEY`)

- 📚 **文檔與工具**
  - Migration SQL 腳本 (`supabase-migrations/002_fix_exchange_rates_rls.sql`)
  - 手動 Migration 腳本 (`MANUAL_RLS_FIX.sql`)
  - 匯率功能設置指南 (`docs/EXCHANGE_RATES_SETUP.md`)
  - 多份技術文檔 (實作報告、使用指南)
  - 測試腳本 (`scripts/test-exchange-rates.sh`)

### Changed (變更)
- 🔧 **Supabase 整合重構**
  - 匯率服務改用依賴注入模式
  - 所有資料庫操作函數接受 `SupabaseClient` 參數
  - API Routes 使用 Server Side 客戶端
  - 修復類型安全問題

- 🔒 **資料庫 RLS 政策優化**
  - `exchange_rates` 表新增 INSERT 權限
  - `exchange_rates` 表新增 UPDATE 權限
  - 保持 DELETE 操作禁用（資料完整性）

### Fixed (修復)
- 🐛 修復 Supabase 客戶端在 API Routes 中的使用錯誤
- 🐛 修復 i18n 中間件攔截 API 路由的問題
- 🐛 修復 `exchange_rates` 表權限不足問題

### Technical Details (技術細節)
- **API 供應商**: ExchangeRate-API.com
- **免費額度**: 1,500 requests/month
- **快取策略**: Next.js 快取 1 小時 + 資料庫持久化
- **支援貨幣**: 5 種 (可擴展至 161 種)
- **匯率更新**: 每日一次（UTC 00:00）

### Breaking Changes (破壞性變更)
- ⚠️  匯率服務函數簽名變更：
  ```typescript
  // Before:
  getExchangeRates('USD')

  // After:
  const supabase = await createClient()
  getExchangeRates(supabase, 'USD')
  ```

### Migration Notes (遷移說明)
- ⚠️  需要在 **Zeabur PostgreSQL** 容器內執行 RLS Migration (5 分鐘)
- 📖 **SSH 操作指南**: `ZEABUR_SSH_GUIDE.md` (⭐ 最重要)
- 🚨 **當前問題與解決**: `CURRENT_ISSUE_AND_SOLUTION.md`
- 📚 完整文檔: `docs/ARCHITECTURE.md`
- 📊 狀態報告: `FINAL_STATUS.md`

---

## [0.1.0] - 2025-10-14

### Added (新增)
- ✨ **基礎架構**
  - Next.js 15.5.5 專案初始化
  - TypeScript 完整配置
  - Tailwind CSS 4 樣式系統
  - ESLint 規範設定
  - Turbopack 開發環境

- 🔐 **認證系統**
  - Supabase Auth 整合 (SSR)
  - Google OAuth 2.0 登入
  - 會話管理與 Cookie 刷新
  - 保護路由中間件
  - 登入頁面與 OAuth 回調處理

- 🌐 **國際化 (i18n)**
  - next-intl v4.3.12 整合
  - 雙語支援 (繁體中文/English)
  - 動態路由前綴 (`/zh/*`, `/en/*`)
  - 語言切換功能
  - 翻譯檔案管理 (messages/zh.json, messages/en.json)

- 🗄️ **資料庫架構**
  - PostgreSQL Schema 設計 (supabase-schema.sql)
  - 5 個主要資料表:
    - `customers` (客戶管理)
    - `products` (產品目錄)
    - `quotations` (報價單)
    - `quotation_items` (報價項目)
    - `exchange_rates` (匯率歷史)
  - Row Level Security (RLS) 政策
  - 7 個效能索引
  - 自動更新 `updated_at` 觸發器
  - 報價單號碼自動生成函數

- 🎨 **UI 元件庫** (8 個可重用元件)
  - `FormInput` - 單語言表單輸入
  - `BilingualFormInput` - 雙語輸入欄
  - `DeleteConfirmModal` - 刪除確認對話框
  - `EmptyState` - 空白狀態提示
  - `LoadingSpinner` - 載入轉軸
  - `PageHeader` - 頁面標題元件
  - `Navbar` - 頂部導航欄
  - `Sidebar` - 側邊選單

- 📊 **儀表板模組**
  - 統計卡片 (報價單/客戶/產品數量)
  - 動態資料獲取 (伺服器端渲染)
  - 歡迎訊息
  - 完整雙語支援

- 👥 **客戶管理 (Customers)**
  - 客戶列表頁 (`/customers`)
  - 新增客戶 (`/customers/new`)
  - 編輯客戶 (`/customers/[id]`)
  - 刪除確認功能
  - 雙語名稱與地址存儲
  - Email、電話、地址管理
  - 搜尋功能
  - Client Components: `CustomerList`, `CustomerForm`

- 📦 **產品管理 (Products)**
  - 產品列表頁 (`/products`)
  - 新增產品 (`/products/new`)
  - 編輯產品 (`/products/[id]`)
  - 刪除確認功能
  - 雙語產品名稱與描述
  - 價格與幣別設定
  - 分類管理
  - 搜尋功能
  - Client Components: `ProductList`, `ProductForm`

- 📄 **報價單管理 (Quotations)**
  - 報價單列表頁 (`/quotations`)
  - 新增報價單 (`/quotations/new`)
  - 報價單詳情 (`/quotations/[id]`)
  - 刪除確認功能
  - 多幣別支援 (TWD, USD, EUR, JPY, CNY)
  - 動態項目管理 (新增/刪除行項目)
  - 產品選擇與自動填入價格
  - 自動計算小計、稅金、總計
  - 狀態管理 (草稿/已發送/已接受/已拒絕)
  - 日期範圍選擇
  - 備註輸入 (雙語)
  - Client Components: `QuotationList`, `QuotationForm`, `QuotationDetail`

- 🛠️ **開發工具**
  - Supabase CLI 本地安裝
  - npm scripts 配置
  - 測試資料導入腳本 (scripts/import-test-data.sh)
  - SQL 測試資料 (scripts/seed-test-data.sql)

- 📖 **文檔**
  - README.md (完整專案說明)
  - SUPABASE.md (CLI 使用指南)
  - ROADMAP.md (開發路線圖)
  - CHANGELOG.md (本文件)

### Changed (變更)
- 🔧 修復 Dashboard 雙語混合顯示問題
- 🔧 修復 404 路由重定向錯誤
- 🔧 優化 Supabase middleware 整合
- 🔧 改善表單驗證邏輯

### Technical Details (技術細節)
- **前端**: Next.js 15.5.5 (App Router + Turbopack)
- **框架**: React 19.1.0
- **語言**: TypeScript 5+
- **樣式**: Tailwind CSS 4
- **資料庫**: PostgreSQL (Supabase)
- **認證**: Supabase Auth (Google OAuth)
- **國際化**: next-intl v4.3.12
- **部署**: Vercel (規劃中)

### Statistics (統計)
- TypeScript 檔案: 39 個
- UI 元件: 8 個
- 功能模組: 3 個 (報價單/客戶/產品)
- 資料庫表: 5 個
- 語言支援: 2 種 (中文/英文)
- 幣別支援: 5 種
- 代碼完成度: ~60%

---

## 版本規範說明

### 版本格式
- **[主版本].[次版本].[修訂號]**
  - 主版本: 重大架構變更或不相容更新
  - 次版本: 新功能添加
  - 修訂號: Bug 修復和小改進

### 變更類型
- **Added**: 新增功能
- **Changed**: 現有功能變更
- **Deprecated**: 即將移除的功能
- **Removed**: 已移除的功能
- **Fixed**: Bug 修復
- **Security**: 安全性修復

---

**維護者**: Claude AI Assistant
**專案**: Quotation System | 報價單系統
**開始日期**: 2025-10-14
