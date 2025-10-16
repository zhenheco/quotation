# 變更日誌 | Changelog

本文件記錄報價單系統的所有重要變更。

格式基於 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)，
版本號遵循 [語義化版本](https://semver.org/lang/zh-TW/)。

---

## [Unreleased]

### 計劃開發
- PDF 匯出功能（雙語）
- Email 發送功能
- 進階圖表分析
- 批次操作功能
- 匯率自動更新機制（Cron Job）

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
