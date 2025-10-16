# 系統架構文檔 | System Architecture

## 📐 架構概覽

本專案採用 **混合雲架構**，結合 Supabase 雲端服務和 Self-hosted PostgreSQL：

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser)                        │
│                  Next.js 15 App Router                      │
└────────────┬──────────────────────┬─────────────────────────┘
             │                      │
             │ Authentication       │ Data Operations
             ▼                      ▼
    ┌────────────────┐    ┌──────────────────────┐
    │   Supabase     │    │  PostgreSQL (Zeabur) │
    │   (Cloud)      │    │   (Self-hosted)      │
    │                │    │                      │
    │ • Google OAuth │    │ • customers          │
    │ • Session Mgmt │    │ • products           │
    │ • Auth Tokens  │    │ • quotations         │
    │                │    │ • quotation_items    │
    │                │    │ • exchange_rates     │
    └────────────────┘    └──────────────────────┘
             │                      │
             └──────────┬───────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  ExchangeRate    │
              │  API (External)  │
              └──────────────────┘
```

---

## 🎯 架構設計理由

### 為什麼使用混合架構？

#### 1. **成本優化** 💰
- **Supabase 免費方案**: 處理認證（50,000 MAU）
- **Self-hosted DB**: 完全掌控成本，無需為資料庫付費
- **總成本**: 遠低於全 Supabase 方案

#### 2. **資料主權** 🔒
- **業務資料**: 完全掌控在自己的資料庫
- **備份控制**: 自主決定備份策略
- **合規性**: 符合資料本地化要求

#### 3. **彈性擴展** 📈
- **認證服務**: Supabase 自動擴展
- **資料庫**: 可獨立升級硬體規格
- **區域部署**: 資料庫可部署在最近的區域

#### 4. **專業分工** 🎯
- **認證**: 交給 Supabase 專業處理
- **資料**: 自己管理，完全掌控

---

## 🏗️ 核心元件

### 1. Supabase (雲端服務)

**用途**: 僅用於認證和會話管理

**功能**:
- ✅ Google OAuth 2.0 整合
- ✅ Session token 管理
- ✅ SSR Cookie-based sessions
- ✅ 用戶管理 (auth.users)

**連接資訊**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://nxlqtnnssfzzpbyfjnby.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

**重要**:
- ❌ **不使用** Supabase 的 PostgreSQL 儲存業務資料
- ❌ **不需要** 在 Supabase Dashboard 執行業務 SQL
- ✅ **僅使用** Auth 功能

---

### 2. PostgreSQL on Zeabur (Self-hosted)

**用途**: 主要資料庫，儲存所有業務資料

**資料表**:
1. `customers` - 客戶資料
2. `products` - 產品目錄
3. `quotations` - 報價單
4. `quotation_items` - 報價項目
5. `exchange_rates` - 匯率歷史

**RLS 政策**:
- 基於 `user_id` 的行級安全性
- 用戶只能存取自己的資料

**連接方式**:
```bash
# 方法 A: 使用 MCP (本地開發)
# 配置在 ~/.config/claude-code/mcp_settings.json

# 方法 B: 使用 psql
psql "postgresql://user:password@host:port/database"

# 方法 C: Zeabur Dashboard
# 直接在 Zeabur 管理介面執行 SQL
```

---

### 3. ExchangeRate-API

**用途**: 提供即時匯率資料

**配額**:
- 免費方案: 1,500 requests/month
- 更新頻率: 每日 UTC 00:00

**支援貨幣**:
- TWD, USD, EUR, JPY, CNY (目前)
- 可擴展至 161 種貨幣

**連接資訊**:
```env
EXCHANGE_RATE_API_KEY=1679aaaab03fec128b24a69a
```

---

## 🔄 資料流程

### 認證流程

```
1. User clicks "Sign in with Google"
   ↓
2. Redirect to Supabase Auth
   ↓
3. Google OAuth consent
   ↓
4. Callback to /auth/callback
   ↓
5. Supabase creates session token
   ↓
6. Cookie stored in browser
   ↓
7. Authenticated ✅
```

### 資料存取流程

```
1. User requests data (e.g., quotations)
   ↓
2. Next.js API Route
   ↓
3. Verify auth token (Supabase)
   ↓
4. Get user_id from token
   ↓
5. Query Zeabur PostgreSQL with RLS filter
   ↓
6. Return filtered data
```

### 匯率更新流程

```
1. Manual trigger or Cron Job
   ↓
2. Call ExchangeRate-API
   ↓
3. Parse response
   ↓
4. Store in Zeabur PostgreSQL (exchange_rates table)
   ↓
5. Cache for 24 hours
```

---

## 🔧 MCP 配置說明

### PostgreSQL MCP

**目的**: 讓 Claude AI 可以直接查詢 Zeabur PostgreSQL

**配置位置**: (待確認)
```json
{
  "mcpServers": {
    "postgres": {
      "command": "mcp-postgres",
      "args": [],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://user:password@zeabur-host:port/database"
      }
    }
  }
}
```

**權限**: 只讀（read-only transactions）

**用途**:
- ✅ 查詢資料表結構
- ✅ 驗證資料
- ✅ 檢查 RLS 政策
- ❌ 無法執行 DDL (CREATE, DROP, ALTER)
- ❌ 無法寫入資料

---

## 📊 環境變數對照表

| 變數名稱 | 用途 | 來源 | 必要性 |
|---------|------|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案 URL | Supabase Dashboard | ✅ 必須 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 公開金鑰 | Supabase Dashboard | ✅ 必須 |
| `EXCHANGE_RATE_API_KEY` | 匯率 API 金鑰 | ExchangeRate-API | ✅ 必須 |
| `DATABASE_URL` | PostgreSQL 連接字串 | Zeabur | ⚠️  視配置方式 |

---

## 🚀 部署配置

### 開發環境

```bash
# 1. Supabase (Cloud) - 無需本地設定
# 2. Zeabur PostgreSQL - 遠端連接
# 3. Next.js - 本地運行
npm run dev

# 所有服務都在雲端，本地只需要 Next.js
```

### 生產環境 (Vercel)

```bash
# 環境變數設定在 Vercel Dashboard:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - EXCHANGE_RATE_API_KEY

# Vercel 自動部署
git push origin main
```

---

## 🔒 安全性考量

### 1. Row Level Security (RLS)

所有資料表都啟用 RLS，確保：
- ✅ 用戶只能存取自己的資料
- ✅ `user_id` 自動從 auth token 提取
- ✅ SQL injection 防護

### 2. API 金鑰保護

```typescript
// ❌ 錯誤: 暴露在客戶端
const apiKey = process.env.NEXT_PUBLIC_EXCHANGE_RATE_API_KEY

// ✅ 正確: Server-side only
const apiKey = process.env.EXCHANGE_RATE_API_KEY
```

### 3. CORS 設定

- Supabase: 自動處理
- Zeabur PostgreSQL: 透過 Supabase Client 連接，無直接暴露

---

## 📝 常見問題 FAQ

### Q1: 為什麼不全部使用 Supabase？

**A**:
- 成本考量（資料庫儲存成本）
- 資料主權（完全掌控資料）
- 彈性擴展（可獨立升級資料庫）

### Q2: 認證資料和業務資料分離會有問題嗎？

**A**:
- 不會，這是業界常見做法
- Supabase Auth 只處理認證，返回 user_id
- 業務資料使用 user_id 作為外鍵關聯

### Q3: 如何在 Zeabur PostgreSQL 執行 Migration？

**A**: 三種方法:
1. 使用 `psql` 命令列工具
2. Zeabur Dashboard 的 SQL Editor
3. 透過管理工具 (pgAdmin, DBeaver 等)

### Q4: MCP PostgreSQL 為什麼只讀？

**A**:
- 安全性考量
- MCP 設計為查詢工具
- 寫入操作應透過應用程式 API

---

## 🛠️ 維護指南

### 定期檢查項目

1. **每週**:
   - ✅ 檢查 ExchangeRate-API 配額使用量
   - ✅ 檢查 Supabase Auth 使用量 (MAU)

2. **每月**:
   - ✅ 備份 Zeabur PostgreSQL 資料庫
   - ✅ 審查 RLS 政策有效性
   - ✅ 檢查慢查詢日誌

3. **每季**:
   - ✅ 資料庫效能優化
   - ✅ 索引分析與調整
   - ✅ 清理過期匯率資料

---

## 📚 相關文檔

| 文檔 | 說明 |
|------|------|
| [README.md](../README.md) | 專案總覽與快速開始 |
| [EXCHANGE_RATES_SETUP.md](EXCHANGE_RATES_SETUP.md) | 匯率功能設置 |
| [FINAL_SETUP_INSTRUCTIONS.md](../FINAL_SETUP_INSTRUCTIONS.md) | RLS Migration 指引 |
| [CHANGELOG.md](../CHANGELOG.md) | 版本變更記錄 |

---

**維護者**: Claude AI + Development Team
**最後更新**: 2025-10-16
**版本**: 1.0
