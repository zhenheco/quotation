# 報價單分享功能實作指南

## 功能概述

報價單分享功能允許用戶生成公開的分享連結，讓客戶無需登入即可查看報價單的完整資訊。此功能提供安全的 token 機制和查看統計。

## 主要特性

### 1. 安全性
- 使用 64 字元的隨機 token（URL-safe）
- Token 與報價單 ID 解耦，防止直接存取
- 支援 RLS（Row Level Security）權限控制
- 可選的過期時間設定
- 可隨時停用分享連結

### 2. 查看統計
- 記錄查看次數
- 追蹤最後查看時間
- 支援後續擴展（如查看者 IP、裝置資訊等）

### 3. 使用者體驗
- 一鍵生成分享連結
- 複製連結功能
- 響應式設計（手機、平板、電腦都能正常顯示）
- 中英文語言切換

## 架構設計

### 資料庫 Schema

```sql
-- share_tokens 表結構
CREATE TABLE share_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### API 端點

#### 1. POST `/api/quotations/[id]/share`
生成分享連結

**請求參數：**
```json
{
  "expiresInDays": 30  // 可選，null 表示永久有效
}
```

**回應：**
```json
{
  "success": true,
  "token": "abc123...",
  "shareUrl": "https://yourdomain.com/share/abc123...",
  "expiresAt": "2025-11-17T00:00:00Z"
}
```

#### 2. GET `/api/quotations/[id]/share`
取得分享狀態

**回應：**
```json
{
  "isShared": true,
  "token": "abc123...",
  "shareUrl": "https://yourdomain.com/share/abc123...",
  "expiresAt": "2025-11-17T00:00:00Z",
  "viewCount": 42,
  "lastViewedAt": "2025-10-17T12:00:00Z"
}
```

#### 3. DELETE `/api/quotations/[id]/share`
停用分享連結

**回應：**
```json
{
  "success": true,
  "message": "Share link deactivated successfully"
}
```

### 頁面結構

```
/app
  /share
    /[token]
      ├── page.tsx                    # Server Component，處理資料獲取
      └── SharedQuotationView.tsx     # Client Component，展示報價單
  /[locale]
    /quotations
      /[id]
        └── QuotationDetail.tsx       # 整合 ShareButton
/components
  └── ShareButton.tsx                 # 分享按鈕組件
```

## 部署步驟

### 1. 執行資料庫遷移

```bash
# 在 Supabase Dashboard 的 SQL Editor 中執行
# 檔案位置: supabase-migrations/003_add_share_tokens.sql
```

或使用命令列：

```bash
psql -h your-db-host -U postgres -d your-database -f supabase-migrations/003_add_share_tokens.sql
```

### 2. 設定環境變數

確保 `.env.local` 包含以下變數：

```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
# 用於生成完整的分享 URL
```

### 3. 驗證功能

1. 登入系統並開啟任一報價單詳情頁
2. 點擊「分享」按鈕
3. 點擊「生成分享連結」
4. 複製連結並在無痕模式中開啟
5. 驗證是否能正常查看報價單

## 安全性考量

### 1. Token 生成
- 使用 PostgreSQL 的 `gen_random_bytes(32)` 生成高熵隨機 token
- 經過 base64 編碼並轉換為 URL-safe 格式
- 確保 token 唯一性（資料庫層級的 UNIQUE 約束）

### 2. 權限控制
- 使用 Supabase RLS 確保只有報價單擁有者可以生成/管理分享連結
- 匿名用戶只能透過有效的 token 查看報價單
- 過期或停用的連結無法存取

### 3. 資料保護
- 分享頁面不暴露敏感的內部資訊
- 不顯示用戶 ID 或其他系統內部資料
- 使用 Server Component 確保 token 驗證在伺服器端完成

### 4. 防止濫用
- 記錄查看次數（未來可擴展為限制查看次數）
- 支援設定過期時間
- 可隨時停用分享連結

## 最佳實踐

### 1. Token 管理
- 建議為敏感報價單設定過期時間
- 定期檢查並清理無效的 token
- 報價單狀態變更時考慮是否需要停用分享連結

### 2. 效能優化
- 分享頁面使用 Server Component，首次載入更快
- 適當使用索引提升查詢效能
- 考慮加入 CDN 快取靜態資源

### 3. 使用者體驗
- 提供清晰的分享狀態提示
- 複製成功後顯示即時回饋
- 在分享頁面顯示公司品牌資訊

## 未來擴展方向

### 1. 進階統計
- 記錄查看者 IP 位址
- 追蹤裝置類型和瀏覽器
- 生成查看報表和趨勢圖

### 2. 訪問控制
- 設定查看次數限制
- 要求輸入密碼才能查看
- 限制特定 IP 範圍存取

### 3. 互動功能
- 客戶可以在分享頁面接受/拒絕報價
- 支援客戶留言和溝通
- 整合電子簽名功能

### 4. 通知機制
- 當有人查看分享連結時發送通知
- 連結即將過期時提醒
- 整合 Webhook 支援第三方整合

### 5. QR Code
- 生成分享連結的 QR Code
- 適合印刷或面對面分享場景

## 故障排除

### 問題 1：分享連結無法開啟
**原因：** RLS 設定錯誤或 token 已過期
**解決：** 檢查資料庫的 RLS policies 是否正確設定，確認 token 狀態

### 問題 2：生成分享連結失敗
**原因：** 權限不足或資料庫連線問題
**解決：** 確認用戶已登入且對報價單有完整權限

### 問題 3：查看次數未更新
**原因：** 異步更新失敗
**解決：** 檢查資料庫連線和 RLS policies，此功能為非關鍵性功能，失敗不影響主流程

### 問題 4：複製功能在某些瀏覽器無效
**原因：** 瀏覽器不支援 Clipboard API 或 HTTPS 要求
**解決：** 確保網站使用 HTTPS，提供手動複製的備選方案

## 技術規格

- **Next.js**: 15.x
- **React**: 19.x
- **TypeScript**: 5.x
- **Supabase**: PostgreSQL 15+
- **驗證**: Supabase Auth
- **樣式**: Tailwind CSS 4.x

## 檔案清單

### 資料庫
- `/supabase-migrations/003_add_share_tokens.sql` - 資料庫 schema 和 RLS policies

### API 路由
- `/app/api/quotations/[id]/share/route.ts` - 分享連結管理 API

### 頁面和組件
- `/app/share/[token]/page.tsx` - 分享頁面（Server Component）
- `/app/share/[token]/SharedQuotationView.tsx` - 報價單展示組件（Client Component）
- `/components/ShareButton.tsx` - 分享按鈕組件

### 整合
- `/app/[locale]/quotations/[id]/QuotationDetail.tsx` - 報價單詳情頁（已整合分享按鈕）

### 多語系
- `/messages/zh.json` - 繁體中文翻譯
- `/messages/en.json` - 英文翻譯

## 授權和貢獻

此功能為報價單系統的一部分，遵循項目整體的授權條款。

---

**最後更新**: 2025-10-17
**版本**: 1.0.0
**維護者**: 周振家
