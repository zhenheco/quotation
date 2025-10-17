# 報價單分享功能 - 快速開始

## 快速部署（3 步驟）

### 步驟 1：執行資料庫遷移
在 Supabase Dashboard 的 SQL Editor 中執行：
```bash
supabase-migrations/003_add_share_tokens.sql
```

### 步驟 2：設定環境變數
在 `.env.local` 中加入：
```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 步驟 3：重新部署應用
```bash
# 如果使用 Vercel
vercel --prod

# 或使用您的部署流程
npm run build
```

## 使用方式

### 對於管理員
1. 登入系統
2. 開啟任一報價單詳情頁
3. 點擊右上角的「分享」按鈕（紫色按鈕）
4. 點擊「生成分享連結」
5. 複製連結並分享給客戶

### 對於客戶
1. 收到分享連結
2. 直接在瀏覽器中開啟（無需登入）
3. 查看完整的報價單資訊
4. 可切換中英文語言

## 主要功能

✅ **安全**：使用隨機 token，不暴露報價單 ID
✅ **統計**：記錄查看次數和最後查看時間
✅ **控制**：可隨時停用分享連結
✅ **靈活**：支援設定過期時間（可選）
✅ **美觀**：響應式設計，支援所有裝置
✅ **多語**：中英文切換

## API 端點

```typescript
// 生成分享連結
POST /api/quotations/[id]/share
Body: { expiresInDays?: number }

// 取得分享狀態
GET /api/quotations/[id]/share

// 停用分享連結
DELETE /api/quotations/[id]/share
```

## 分享連結格式

```
https://yourdomain.com/share/[64-char-token]
```

## 安全性特性

- 64 字元隨機 token（URL-safe）
- Row Level Security (RLS) 權限控制
- 支援過期時間設定
- 可隨時停用分享
- 只暴露必要的報價單資訊

## 疑難排解

| 問題 | 解決方案 |
|------|---------|
| 分享連結打不開 | 檢查 token 是否過期或已停用 |
| 無法生成連結 | 確認已登入且有權限存取報價單 |
| 複製功能無效 | 確保使用 HTTPS 連線 |

## 完整文件

詳細的實作指南請參閱：[share-feature-guide.md](./share-feature-guide.md)

---

**需要幫助？** 請查看完整文件或聯繫系統管理員。
