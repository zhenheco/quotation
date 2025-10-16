# Quotation System | 報價單系統

A modern, bilingual (English/Chinese) quotation management system with multi-currency support and Google authentication.

現代化的中英雙語報價單管理系統，支援多幣別轉換和 Google 登入。

## ✨ Features | 功能特點

### Core Features | 核心功能
- 🔐 **Google OAuth Authentication** | Google OAuth 登入認證
- 🌐 **Bilingual Support** (English/中文) | 雙語系統支援
- 💱 **Multi-Currency** (TWD, USD, EUR, JPY, CNY) | 多幣別支援
- 💱 **Real-time Exchange Rates** | 即時匯率整合 (ExchangeRate-API)
- 📄 **Quotation Management** | 報價單管理
- 👥 **Customer Management** | 客戶管理
- 📦 **Product Management** | 產品管理
- 📊 **Dashboard Analytics** | 儀表板分析
- 💾 **Real-time Database** with Supabase | Supabase 即時資料庫
- 🔒 **Row Level Security** (RLS) | 行級安全性
- 📑 **PDF Export** (Chinese/English/Bilingual) | PDF 匯出（中文/英文/雙語）

### Upcoming Features | 即將推出
- 📧 **Email Quotations** | 郵件發送報價單
- 📱 **Mobile Responsive** | 行動裝置響應式設計
- 🔄 **Auto Exchange Rate Sync** (Cron Job) | 匯率自動同步
- 📈 **Advanced Analytics** | 進階分析圖表

## 🚀 Tech Stack | 技術棧

- **Frontend**: Next.js 15.5.5 (App Router) + TypeScript
- **Styling**: Tailwind CSS 4
- **Authentication**: Supabase Auth (Google OAuth) - Cloud
- **Database**: PostgreSQL (Self-hosted on Zeabur) + Supabase Cloud
- **Internationalization**: next-intl v4.3.12
- **Exchange Rates**: ExchangeRate-API
- **PDF Generation**: @react-pdf/renderer
- **Deployment**: Vercel

## 🏗️ Architecture | 系統架構

本專案採用**混合架構**：

### Supabase (雲端服務)
- ✅ **認證系統**: Google OAuth 2.0
- ✅ **會話管理**: SSR Cookie-based sessions
- ✅ **即時功能**: Real-time subscriptions (未來)

### PostgreSQL on Zeabur (Self-hosted)
- ✅ **主要資料庫**: 所有業務資料
- ✅ **Tables**: customers, products, quotations, quotation_items, exchange_rates
- ✅ **RLS 政策**: Row Level Security
- ✅ **完全控制**: 自主管理、備份、擴展

### 為什麼使用混合架構？
1. **成本優化**: Supabase 免費方案處理認證，資料庫自主託管
2. **資料主權**: 業務資料完全掌控在自己手中
3. **彈性擴展**: 可獨立擴展認證服務和資料庫
4. **最佳實踐**: 認證交給專業服務，資料自己管理

## 📋 Prerequisites | 前置需求

- Node.js 18+
- npm or yarn
- **Supabase account** (僅用於認證)
- **PostgreSQL database** (Self-hosted on Zeabur or other platform)
- **Google Cloud Console account** (for OAuth)
- **ExchangeRate-API key** (免費: 1,500 requests/month)

## 🔧 Installation | 安裝步驟

### 1. Clone the repository | 複製專案

```bash
git clone <your-repo-url>
cd quotation-app
```

### 2. Install dependencies | 安裝依賴套件

```bash
npm install
```

### 3. Set up Supabase (認證服務) | 設置 Supabase

⚠️ **重要**: Supabase 僅用於認證，資料庫使用 Zeabur PostgreSQL

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings** → **API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon/public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **不需要在 Supabase 執行任何 SQL** (資料庫在 Zeabur)

### 4. Set up PostgreSQL on Zeabur (主要資料庫)

1. 登入 [Zeabur](https://zeabur.com)
2. 建立 PostgreSQL 服務
3. 取得連接資訊:
   - Database URL (用於連接)
   - 主機、埠、用戶名、密碼

### 5. Run database migrations on Zeabur | 執行資料庫遷移

**方法 A: 使用 psql (推薦)**

```bash
# 設定資料庫連接 URL
export DB_URL="postgresql://user:password@host:port/database"

# 執行 schema
psql "$DB_URL" -f supabase-schema.sql

# 執行匯率表 RLS 修復
psql "$DB_URL" -f supabase-migrations/002_fix_exchange_rates_rls.sql
```

**方法 B: 使用 Zeabur Dashboard**

1. 前往 Zeabur PostgreSQL 服務
2. 開啟 SQL Editor 或 Database Management
3. 執行 `supabase-schema.sql` 內容
4. 執行 `supabase-migrations/002_fix_exchange_rates_rls.sql` 內容

### 5. Configure Google OAuth | 配置 Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Create **OAuth 2.0 Client ID**:
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/callback` (development)
     - `https://your-domain.com/auth/callback` (production)
5. Copy `Client ID` and `Client Secret`

6. In Supabase Dashboard:
   - Go to **Authentication** → **Providers**
   - Enable **Google**
   - Paste Client ID and Client Secret
   - Save

### 7. Environment Variables | 環境變數

Create `.env.local` file:

```env
# Supabase (僅用於認證)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# PostgreSQL on Zeabur (主要資料庫)
# 注意: 應用程式使用 Supabase Client 連接，但實際資料存在 Zeabur
# 配置方式請參考 lib/supabase/server.ts

# Exchange Rate API (匯率服務)
EXCHANGE_RATE_API_KEY=your-exchangerate-api-key
```

⚠️ **資料庫連接說明**:
- 本專案使用 Supabase Client SDK 進行認證
- 實際資料庫連接指向 Zeabur PostgreSQL
- 確保 Zeabur PostgreSQL 的連接資訊正確配置在 Supabase 專案設定中
- 或者，您需要修改 `lib/supabase/server.ts` 直接連接 Zeabur

### 7. Run the development server | 啟動開發伺服器

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the port shown in terminal)

### 8. Supabase CLI (Optional but Recommended) | Supabase CLI（可選但推薦）

Supabase CLI 已安裝為本地依賴。查看完整指南：[SUPABASE.md](SUPABASE.md)

快速開始：
```bash
# 登入 Supabase
npm run supabase:login

# 連結到您的專案
npm run supabase:link

# 生成 TypeScript 類型
npm run supabase:gen:types
```

## 📁 Project Structure | 專案結構

```
quotation-system/
├── app/
│   ├── [locale]/          # Internationalized routes
│   │   ├── dashboard/     # Dashboard pages
│   │   │   ├── page.tsx
│   │   │   └── layout.tsx
│   │   └── layout.tsx
│   ├── auth/
│   │   └── callback/      # OAuth callback
│   ├── login/             # Login page
│   ├── page.tsx           # Root redirect
│   └── layout.tsx
├── components/
│   ├── Navbar.tsx         # Navigation bar
│   └── Sidebar.tsx        # Sidebar menu
├── i18n/
│   └── request.ts         # i18n configuration
├── lib/
│   └── supabase/          # Supabase client setup
│       ├── client.ts      # Browser client
│       ├── server.ts      # Server client
│       └── middleware.ts  # Auth middleware
├── messages/              # i18n translations
│   ├── en.json
│   └── zh.json
├── supabase/              # Supabase CLI files
│   ├── config.toml
│   └── migrations/        # Database migrations
├── types/
│   └── database.types.ts  # Database type definitions
├── middleware.ts          # Next.js middleware
├── supabase-schema.sql    # Database schema (initial)
├── SUPABASE.md            # Supabase CLI guide
└── README.md
```

## 🗄️ Database Schema | 資料庫架構

The system uses the following main tables:

- **customers** - Customer information (bilingual)
- **products** - Product catalog (bilingual)
- **quotations** - Quotation headers
- **quotation_items** - Line items for quotations
- **exchange_rates** - Historical exchange rates

All tables have Row Level Security (RLS) enabled for user data isolation.

## 🔐 Authentication Flow | 認證流程

1. User clicks "Sign in with Google"
2. Redirected to Google OAuth consent screen
3. After approval, redirected to `/auth/callback`
4. Session established via Supabase
5. Redirected to `/[locale]/dashboard`

## 🌍 Internationalization | 國際化

The app supports:
- **English** (`/en/*`)
- **中文** (`/zh/*`)

Language toggle available in the navbar.

## 📝 Usage | 使用說明

### Creating a Quotation | 建立報價單

1. Navigate to **Quotations** → **Create New**
2. Select customer and currency
3. Add line items (products/services)
4. Set tax rate and discount
5. Save as draft or send to customer

### Multi-Currency Support | 多幣別支援

- Select base currency for each product
- Choose display currency for quotation
- System automatically converts using latest rates
- Historical rates preserved for each quotation

## 🚢 Deployment | 部署

### Vercel Deployment

1. Push code to GitHub
2. Import project to Vercel
3. Configure environment variables
4. Deploy

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 🤝 Contributing | 貢獻

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License | 授權

MIT License

---

**Built with ❤️ using Next.js, Supabase, and Tailwind CSS**
