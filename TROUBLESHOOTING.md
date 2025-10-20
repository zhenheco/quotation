# 🔧 故障排除指南

本指南涵蓋報價單系統常見的問題和解決方案。

---

## 📋 目錄

- [環境設置問題](#環境設置問題)
- [資料庫連接問題](#資料庫連接問題)
- [認證和授權問題](#認證和授權問題)
- [API 錯誤](#api-錯誤)
- [PDF 生成問題](#pdf-生成問題)
- [匯率同步問題](#匯率同步問題)
- [性能問題](#性能問題)
- [部署問題](#部署問題)

---

## 環境設置問題

### 問題：npm install 失敗

**症狀**：
```bash
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**解決方案**：
```bash
# 清除 npm 緩存
npm cache clean --force

# 刪除 node_modules 和 package-lock.json
rm -rf node_modules package-lock.json

# 重新安裝
npm install

# 如果還是失敗，使用 --legacy-peer-deps
npm install --legacy-peer-deps
```

### 問題：TypeScript 編譯錯誤

**症狀**：
```
error TS2307: Cannot find module '@/lib/...' or its corresponding type declarations
```

**解決方案**：
1. 檢查 `tsconfig.json` 中的路徑配置
2. 重新啟動 TypeScript 伺服器（VS Code: Cmd+Shift+P → TypeScript: Restart TS Server）
3. 清除 Next.js 緩存：
```bash
rm -rf .next
npm run dev
```

### 問題：環境變數未載入

**症狀**：
```
Error: Missing environment variable: DATABASE_URL
```

**解決方案**：
1. 確認 `.env.local` 檔案存在且格式正確
2. 重新啟動開發伺服器
3. 檢查變數名稱是否正確（區分大小寫）
4. 確認 `.env.local` 不在 `.gitignore` 中（應該在）

```bash
# 正確的 .env.local 格式
DATABASE_URL="postgresql://user:password@host:port/database"
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
```

---

## 資料庫連接問題

### 問題：無法連接到 PostgreSQL

**症狀**：
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**解決方案**：

1. **檢查資料庫是否運行**：
```bash
# macOS (Postgres.app)
ps aux | grep postgres

# 使用 psql 測試連接
psql postgresql://user:password@host:port/database
```

2. **檢查連接字串格式**：
```env
# 正確格式
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"

# Zeabur 格式（包含 SSL）
ZEABUR_DATABASE_URL="postgresql://user:pass@host.zeabur.com:port/db?sslmode=require"
```

3. **防火牆/網路問題**：
```bash
# 測試端口連接
telnet host 5432
# 或
nc -zv host 5432
```

### 問題：Supabase 連接錯誤

**症狀**：
```
AuthApiError: Invalid API key
```

**解決方案**：
1. 確認使用正確的 Anon Key（不是 Service Role Key）
2. 檢查 Supabase 專案是否已暫停（免費版會自動暫停）
3. 確認 URL 和 Key 沒有多餘的空格或引號

```env
# 正確格式（注意沒有引號）
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 問題：資料庫遷移失敗

**症狀**：
```
Error: relation "customers" does not exist
```

**解決方案**：
1. 執行資料庫遷移腳本：
```bash
# 檢查資料庫結構
psql $DATABASE_URL -c "\dt"

# 執行遷移（如果有遷移腳本）
npm run migrate

# 或手動執行 SQL
psql $DATABASE_URL < scripts/schema.sql
```

2. 確認資料庫索引：
```bash
# 執行索引優化腳本
./scripts/apply-indexes.sh
```

---

## 認證和授權問題

### 問題：登入後立即登出

**症狀**：
用戶登入成功但立即被登出，或無法保持登入狀態

**解決方案**：
1. 檢查 Cookie 設定（HTTP vs HTTPS）
2. 確認 Session 配置正確
3. 檢查瀏覽器 Cookie 設定

```typescript
// 檢查 lib/auth.ts 中的 Cookie 設定
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7 // 7 天
}
```

### 問題：CSRF Token 錯誤

**症狀**：
```
403 Forbidden: CSRF token validation failed
```

**解決方案**：
1. 確認前端有正確發送 CSRF token
2. 檢查 Cookie 是否被阻擋
3. 暫時停用 CSRF 保護進行測試（僅開發環境）

```typescript
// 臨時停用 CSRF（僅用於調試）
// middleware.ts
export function middleware(request: NextRequest) {
  // return csrfProtection(request)  // 註解掉
  return NextResponse.next()
}
```

### 問題：權限不足錯誤

**症狀**：
```
403 Forbidden: Insufficient permissions
```

**解決方案**：
1. 檢查用戶角色：
```bash
# 查詢用戶角色
psql $ZEABUR_DATABASE_URL -c "SELECT * FROM user_roles WHERE user_id = 'xxx';"
```

2. 執行測試資料腳本添加管理員權限：
```bash
# 參考 scripts/setup-test-admin.sh
./scripts/setup-test-admin.sh your-user-id
```

---

## API 錯誤

### 問題：Rate Limit 超限

**症狀**：
```
429 Too Many Requests
Retry-After: 60 seconds
```

**解決方案**：
1. **開發環境**：將 IP 加入白名單
```typescript
// lib/middleware/rate-limiter.ts
const IP_WHITELIST = new Set<string>([
  '127.0.0.1',
  '::1',
  'your-dev-ip'
])
```

2. **生產環境**：
   - 等待限制時間結束
   - 優化前端減少不必要的請求
   - 考慮實作請求緩存

### 問題：SQL Injection 警告

**症狀**：
```
400 Bad Request: Invalid field name
```

**解決方案**：
這是正常的安全機制。確認你的請求只使用允許的欄位：

```typescript
// 允許的欄位白名單
CUSTOMER_ALLOWED_FIELDS = ['name', 'email', 'phone', 'address', 'tax_id', 'contact_person']
PRODUCT_ALLOWED_FIELDS = ['sku', 'name', 'description', 'unit_price', 'currency', 'category']
QUOTATION_ALLOWED_FIELDS = ['customer_id', 'status', 'issue_date', 'valid_until', 'currency', 'subtotal', 'tax_rate', 'tax_amount', 'total_amount', 'notes']
```

### 問題：JSON 解析錯誤

**症狀**：
```
SyntaxError: Unexpected token < in JSON at position 0
```

**解決方案**：
1. 檢查 API 端點是否正確
2. 檢查回應是否為 HTML 錯誤頁面（而非 JSON）
3. 使用瀏覽器開發者工具檢查實際回應

```javascript
// 添加錯誤處理
fetch('/api/customers')
  .then(res => {
    if (!res.ok) {
      return res.text().then(text => {
        console.error('Response:', text)
        throw new Error(`HTTP ${res.status}: ${text}`)
      })
    }
    return res.json()
  })
```

---

## PDF 生成問題

### 問題：PDF 中文字體不顯示

**症狀**：
PDF 生成成功但中文顯示為方塊或亂碼

**解決方案**：
1. 確認字體檔案存在：
```bash
ls -la public/fonts/
# 應該看到 NotoSansCJKtc-*.ttf 或類似字體
```

2. 檢查 PDF 生成器配置：
```typescript
// lib/pdf/generator.ts
const font = {
  NotoSansCJK: {
    normal: 'public/fonts/NotoSansCJKtc-Regular.ttf',
    bold: 'public/fonts/NotoSansCJKtc-Bold.ttf',
  }
}
```

3. 測試字體載入：
```bash
# 下載缺失的字體
wget https://github.com/googlefonts/noto-cjk/releases/download/...
```

### 問題：PDF 生成超時

**症狀**：
```
Error: PDF generation timeout after 30 seconds
```

**解決方案**：
1. 增加超時時間（暫時性）
2. 優化 PDF 模板（減少複雜度）
3. 考慮改用背景任務處理

```typescript
// app/api/quotations/[id]/pdf/route.ts
const pdf = await generatePDF(data, {
  timeout: 60000  // 增加到 60 秒
})
```

---

## 匯率同步問題

### 問題：匯率 API 調用失敗

**症狀**：
```
Error: Failed to fetch exchange rates: 401 Unauthorized
```

**解決方案**：
1. 檢查 API Key 是否正確：
```env
EXCHANGE_RATE_API_KEY=your-api-key-here
```

2. 確認 API 配額未超限
3. 檢查 API 服務狀態

```bash
# 測試 API 連接
curl "https://api.exchangerate-api.com/v4/latest/USD"
```

### 問題：匯率資料過期

**症狀**：
匯率顯示但資料是舊的

**解決方案**：
1. 手動觸發同步：
```bash
# 調用同步 API
curl -X POST http://localhost:3000/api/exchange-rates/sync
```

2. 檢查快取設定：
```typescript
// 確認快取時間
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 小時
```

3. 清除快取並重新同步：
```bash
# 如果使用 Redis
redis-cli FLUSHDB

# 如果使用資料庫
psql $DATABASE_URL -c "DELETE FROM exchange_rates;"
```

---

## 性能問題

### 問題：頁面載入緩慢

**症狀**：
頁面載入時間超過 3 秒

**解決方案**：

1. **檢查資料庫查詢**：
```bash
# 啟用資料庫查詢日誌
# 查看慢查詢
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

2. **應用資料庫索引**：
```bash
./scripts/apply-indexes.sh
```

3. **使用瀏覽器效能工具**：
- 開啟 Chrome DevTools → Performance
- 錄製載入過程
- 分析主要瓶頸

### 問題：記憶體洩漏

**症狀**：
伺服器記憶體使用持續增長

**解決方案**：
1. 檢查 Rate Limiter LRU Cache 大小
2. 檢查是否有未關閉的資料庫連接
3. 重啟伺服器（暫時性）

```typescript
// 監控記憶體使用
import { getRateLimitStats } from '@/lib/middleware/rate-limiter'

// API 路由
export async function GET() {
  const stats = getRateLimitStats()
  const mem = process.memoryUsage()
  return Response.json({ stats, memory: mem })
}
```

---

## 部署問題

### 問題：Vercel 部署失敗

**症狀**：
```
Error: Build failed with exit code 1
```

**解決方案**：
1. 檢查構建日誌找出具體錯誤
2. 確認環境變數已在 Vercel 設置
3. 本地測試生產構建：

```bash
# 本地測試生產構建
npm run build
npm start

# 檢查構建輸出
ls -la .next/
```

### 問題：環境變數未生效

**症狀**：
部署後功能正常但某些功能失效（如資料庫連接）

**解決方案**：
1. 在 Vercel Dashboard 檢查環境變數
2. 確認變數對應正確的環境（Production / Preview / Development）
3. 重新部署觸發變數更新

```bash
# 使用 Vercel CLI 設置環境變數
vercel env add DATABASE_URL production
```

### 問題：CORS 錯誤

**症狀**：
```
Access to fetch has been blocked by CORS policy
```

**解決方案**：
配置 Next.js headers：

```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}
```

---

## 💡 調試技巧

### 啟用詳細日誌

```typescript
// 在 .env.local 中
LOG_LEVEL=DEBUG

// 使用 logger
import { logger } from '@/lib/logger'
logger.debug('Detailed debug info', { context: {...} })
```

### 檢查請求詳情

```bash
# 使用 curl 檢查 API
curl -v http://localhost:3000/api/customers \
  -H "Cookie: session=xxx" \
  -H "Content-Type: application/json"

# 檢查 headers
curl -I http://localhost:3000/api/customers
```

### 資料庫除錯

```sql
-- 檢查表結構
\d customers

-- 檢查索引
\di

-- 查看慢查詢
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- 檢查連接數
SELECT count(*) FROM pg_stat_activity;
```

---

## 🆘 獲取幫助

如果以上方法都無法解決問題：

1. **查看相關文檔**：
   - [CODE_QUALITY_SUMMARY.md](CODE_QUALITY_SUMMARY.md) - 已知問題和解決方案
   - [ISSUELOG.md](ISSUELOG.md) - 歷史問題記錄
   - [docs/README.md](docs/README.md) - 完整文檔導航

2. **檢查日誌**：
   - 瀏覽器開發者工具 Console
   - Next.js 開發伺服器輸出
   - 資料庫日誌
   - 生產環境日誌（Vercel、Zeabur 等）

3. **創建 Issue**：
   - 記錄完整的錯誤訊息
   - 提供重現步驟
   - 附上相關配置（移除敏感資訊）
   - 說明已嘗試的解決方案

---

**最後更新**: 2025-10-21
**版本**: 1.0.0
