# Quotation System | 報價單系統

A modern, bilingual (English/Chinese) quotation management system with multi-currency support and Google authentication.

現代化的中英雙語報價單管理系統，支援多幣別轉換和 Google 登入。

## ✨ Features | 功能特點

### Core Features | 核心功能
- 🔐 **Google OAuth Authentication** | Google OAuth 登入認證
- 🌐 **Bilingual Support** (English/中文) | 雙語系統支援
- 💱 **Multi-Currency** (TWD, USD, EUR, JPY, CNY) | 多幣別支援
- 📄 **Quotation Management** | 報價單管理
- 👥 **Customer Management** | 客戶管理
- 📦 **Product Management** | 產品管理
- 📊 **Dashboard Analytics** | 儀表板分析
- 💾 **Real-time Database** with Supabase | Supabase 即時資料庫
- 🔒 **Row Level Security** (RLS) | 行級安全性

### Upcoming Features | 即將推出
- 📈 **Exchange Rate Integration** | 匯率 API 整合
- 📑 **PDF Export** (Bilingual) | PDF 匯出（雙語）
- 📧 **Email Quotations** | 郵件發送報價單
- 📱 **Mobile Responsive** | 行動裝置響應式設計

## 🚀 Tech Stack | 技術棧

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth (Google OAuth)
- **Database**: PostgreSQL (Supabase)
- **Internationalization**: next-intl
- **Deployment**: Vercel

## 📋 Prerequisites | 前置需求

- Node.js 18+
- npm or yarn
- Supabase account
- Google Cloud Console account (for OAuth)

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

### 3. Set up Supabase | 設置 Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings** → **API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon/public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Run database migrations | 執行資料庫遷移

1. Go to Supabase **SQL Editor**
2. Copy the contents of `supabase-schema.sql`
3. Run the SQL script

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

### 6. Environment Variables | 環境變數

Create `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 7. Run the development server | 啟動開發伺服器

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure | 專案結構

```
quotation-app/
├── app/
│   ├── [locale]/          # Internationalized routes
│   │   ├── dashboard/     # Dashboard pages
│   │   │   ├── page.tsx
│   │   │   └── layout.tsx
│   │   └── layout.tsx
├── auth/
│   │   └── callback/      # OAuth callback
│   ├── login/             # Login page
│   └── layout.tsx
├── components/
│   ├── Navbar.tsx         # Navigation bar
│   └── Sidebar.tsx        # Sidebar menu
├── lib/
│   └── supabase/          # Supabase client setup
│       ├── client.ts      # Browser client
│       ├── server.ts      # Server client
│       └── middleware.ts  # Auth middleware
├── messages/              # i18n translations
│   ├── en.json
│   └── zh.json
├── types/
│   └── database.types.ts  # Database type definitions
├── middleware.ts          # Next.js middleware
├── i18n.ts               # i18n configuration
└── supabase-schema.sql   # Database schema
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
