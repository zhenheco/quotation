# 安全審查報告 (Security Audit Report)

**專案**: Quotation System
**審查日期**: 2025-11-23
**審查範圍**: 完整程式碼庫、依賴套件、架構設計
**審查人員**: Security Auditor (AI-powered)

---

## 📊 總體安全評分

**綜合評分**: 6.5/10

### 評分細項
- 🔴 **敏感資料保護**: 3/10 (嚴重問題)
- 🟢 **認證與授權**: 9/10 (優秀)
- 🟢 **注入攻擊防護**: 9/10 (優秀)
- 🟡 **CSRF 防護**: 7/10 (已實作但未啟用)
- 🟢 **檔案上傳安全**: 8/10 (良好)
- 🟡 **依賴套件**: 7/10 (2個高危漏洞)
- 🟡 **其他安全**: 7/10 (缺少部分安全 headers)

---

## 🚨 嚴重安全問題 (Critical)

### 1. ❌ 敏感資料洩漏 - 環境變數未保護

**嚴重程度**: 🔴 CRITICAL
**CVSS 評分**: 9.8 (Critical)
**受影響檔案**:
- `.env.local` (包含生產環境敏感資料)
- `.env.local.bak` (包含生產環境敏感資料)

**問題描述**:
發現 `.env.local` 和 `.env.local.bak` 包含真實的生產環境密鑰和敏感資料：

```bash
# 發現的敏感資料：
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  (完整 JWT)
SUPABASE_DB_URL=postgresql://postgres.nxlqtnnssfzzpbyfjnby:0BcMgW5mlOENYK9G@...  (包含密碼)
EXCHANGE_RATE_API_KEY=1679aaaab03fec128b24a69a
GMAIL_APP_PASSWORD="yhlr dltd sbpe wmdq"
CLOUDFLARE_API_TOKEN=J5rBo9vr43qFjeRf1qT1i-pl-rygExF-EZTrmueq
```

**風險**:
- ✅ `.env.local` 已在 `.gitignore` 中 (正確)
- ✅ Git 歷史中未發現這些檔案被提交 (正確)
- ❌ **但是**：檔案存在於工作目錄，可能被意外提交或洩漏
- ❌ `.env.local.bak` 備份檔案存在風險

**立即修復措施**:

1. **撤銷所有已洩漏的密鑰** (最重要！)：
```bash
# 1. Supabase Service Role Key - 在 Supabase Dashboard 重新生成
# 2. Supabase Database Password - 重設資料庫密碼
# 3. Exchange Rate API Key - 在 ExchangeRate-API 重新生成
# 4. Gmail App Password - 撤銷並重新生成
# 5. Cloudflare API Token - 在 Cloudflare Dashboard 撤銷並重新生成
```

2. **移除敏感檔案並確保 .gitignore 正確**:
```bash
# 移除備份檔案
rm .env.local.bak .env.production.example.bak

# 確保 .gitignore 包含
echo "*.bak" >> .gitignore
echo ".env*" >> .gitignore
echo "!.env.example" >> .gitignore
echo "!.env.local.example" >> .gitignore
```

3. **檢查 Git 歷史**:
```bash
# 確認這些檔案從未被提交
git log --all --full-history --source -- .env.local .env.production

# 如果發現被提交過，使用 BFG Repo-Cleaner 清理
# https://rtyley.github.io/bfg-repo-cleaner/
```

4. **使用環境變數範本**:
```bash
# 只保留範例檔案 (.env.example)，不包含實際值
# 團隊成員從 .env.example 複製並填入自己的值
```

**長期解決方案**:
1. 使用密鑰管理服務 (AWS Secrets Manager, HashiCorp Vault)
2. 在 CI/CD 中使用加密的環境變數
3. 實施 Git pre-commit hooks 防止意外提交

---

## 🟡 高危問題 (High)

### 2. ⚠️ 依賴套件漏洞

**嚴重程度**: 🟡 HIGH
**受影響套件**:
- `glob@10.4.5` - Command Injection (CVE-2024-XXXX)
- `glob@11.0.3` - Command Injection (CVE-2024-XXXX)

**問題描述**:
`glob` 套件的 CLI 功能存在命令注入漏洞。當使用 `-c/--cmd` 參數時，會使用 `shell:true` 執行匹配的檔案。

**風險評估**:
- ✅ 專案中未直接使用 `glob` CLI 功能
- ✅ 僅作為依賴套件間接使用
- ⚠️ 如果未來使用 `glob` CLI，可能面臨風險

**修復建議**:
```bash
# 更新 glob 到最新版本
pnpm update glob

# 執行完整的依賴審計
pnpm audit fix
```

**其他依賴漏洞統計**:
- Critical: 0
- High: 2
- Moderate: 3
- Low: 0

---

### 3. ⚠️ CSRF 保護未啟用

**嚴重程度**: 🟡 HIGH
**受影響範圍**: 所有 POST/PUT/DELETE API 端點

**問題描述**:
專案已實作完整的 CSRF 保護機制 (`lib/security/csrf.ts`)，但未在 middleware 中啟用。

**已實作的功能**:
- ✅ CSRF Token 生成和驗證
- ✅ HMAC-SHA256 簽名
- ✅ 時間常數比較 (防止時序攻擊)
- ✅ Cookie 和 Header 雙重驗證
- ✅ 路徑白名單支援

**未完成的部分**:
- ❌ `middleware.ts` 中未引入 `csrfProtection`
- ❌ 前端未添加 CSRF token 到請求
- ❌ 缺少 `CSRF_SECRET` 環境變數

**修復步驟**:

1. **在 `.env.local` 添加 CSRF Secret**:
```bash
# 生成隨機 secret (32 bytes)
openssl rand -hex 32

# 添加到 .env.local
CSRF_SECRET=<生成的隨機值>
```

2. **在 middleware.ts 啟用 CSRF 保護**:
```typescript
// middleware.ts
import { csrfProtection } from '@/lib/security/csrf'

export async function middleware(request: NextRequest) {
  // 1. CSRF 保護
  const csrfResponse = await csrfProtection(request)
  if (csrfResponse.status === 403) {
    return csrfResponse
  }

  // 2. 其他 middleware 邏輯...
}
```

3. **前端添加 CSRF Token**:
```typescript
// lib/api/client.ts
import { getCsrfTokenFromMeta } from '@/lib/security/csrf'

const token = getCsrfTokenFromMeta()
if (token && method !== 'GET') {
  headers.set('x-csrf-token', token)
}
```

4. **在 HTML 添加 meta 標籤**:
```tsx
// app/layout.tsx
<meta name="csrf-token" content={csrfToken} />
```

---

### 4. ⚠️ Open Redirect 風險

**嚴重程度**: 🟡 MEDIUM
**受影響檔案**: `app/auth/callback/route.ts:7-32`

**問題描述**:
OAuth 回調端點使用未驗證的 `next` 參數進行重定向：

```typescript
const next = searchParams.get('next') ?? '/en/login'
// ...
return NextResponse.redirect(`${origin}${next}`)
```

**風險**:
攻擊者可構造惡意 URL：
```
https://yourdomain.com/auth/callback?code=xxx&next=//evil.com
```

這會導致重定向到 `https://yourdomain.com//evil.com`，瀏覽器會解析為 `https://evil.com`。

**修復建議**:
```typescript
// app/auth/callback/route.ts
function validateRedirectPath(path: string): string {
  // 只允許相對路徑
  if (!path.startsWith('/') || path.startsWith('//')) {
    return '/en/login'
  }

  // 只允許內部路徑 (不包含 protocol 或 domain)
  try {
    const url = new URL(path, 'http://localhost')
    if (url.hostname !== 'localhost') {
      return '/en/login'
    }
    return path
  } catch {
    return '/en/login'
  }
}

const next = validateRedirectPath(searchParams.get('next') ?? '/en/login')
```

---

## 🟢 良好的安全實踐 (Good)

### 5. ✅ 認證與授權機制

**評估**: 優秀 (9/10)

**已實作的安全措施**:
1. ✅ **Supabase Auth 整合**
   - 使用業界標準的認證服務
   - JWT-based 會話管理
   - 自動 token 刷新

2. ✅ **完整的 RBAC 系統**
   - 角色和權限分離
   - 細粒度權限檢查 (`quotations:read`, `quotations:write` 等)
   - 公司層級的隔離

3. ✅ **API 端點保護**
   - 所有 API routes 都有認證檢查
   - 權限驗證在業務邏輯前執行
   - 範例：`app/api/quotations/route.ts:26-41`

4. ✅ **中間件層級的會話管理**
   - `middleware.ts` 自動刷新 session
   - Cookie 設定安全：`httpOnly: true`, `secure: true`, `sameSite: 'lax'`

5. ✅ **超級管理員保護**
   - 管理員端點有額外的 `isSuperAdmin` 檢查
   - 範例：`app/api/admin/users/route.ts:32-38`

**建議改進**:
- 考慮實施 MFA (Multi-Factor Authentication)
- 添加帳號鎖定機制 (防止暴力破解)

---

### 6. ✅ SQL 注入防護

**評估**: 優秀 (9/10)

**已實作的防護**:
1. ✅ **參數化查詢**
   - 所有資料庫查詢都使用參數化
   - 範例：`lib/dal/quotations.ts:395`
     ```typescript
     await db.execute('DELETE FROM quotation_items WHERE id = ?', [itemId])
     ```

2. ✅ **D1 Client 安全實踐**
   - 使用 D1 的 prepared statements
   - 輸入驗證在查詢前執行

3. ✅ **未發現字串拼接查詢**
   - 搜尋結果顯示所有查詢都使用佔位符

**檢查結果**:
```bash
# 未發現危險的 SQL 字串拼接
grep -r "SELECT.*\+" lib/dal/
grep -r "INSERT.*\+" lib/dal/
grep -r "UPDATE.*\+" lib/dal/
# 結果：無匹配
```

---

### 7. ✅ XSS 防護

**評估**: 優秀 (9/10)

**已實作的防護**:
1. ✅ **React 自動轉義**
   - 使用 React/Next.js，自動轉義所有輸出
   - 未發現 `dangerouslySetInnerHTML` 使用

2. ✅ **無 innerHTML 使用**
   - 搜尋結果：未發現直接 DOM 操作

3. ✅ **JSON 資料安全處理**
   - 多語言內容使用 JSON 儲存
   - 輸出前經過 `JSON.parse()` 和 React 渲染

**建議改進**:
- 添加 Content Security Policy (CSP) headers
- 實施 Subresource Integrity (SRI) for CDN 資源

---

### 8. ✅ 速率限制

**評估**: 良好 (8/10)

**已實作的功能**:
1. ✅ **完整的 Rate Limiter 模組** (`lib/middleware/rate-limiter.ts`)
   - LRU Cache 防止記憶體洩漏
   - 支援多種 IP header (Cloudflare, X-Real-IP, X-Forwarded-For)
   - IP 白名單功能
   - 結構化日誌整合

2. ✅ **多種預設配置**:
   - `defaultRateLimiter`: 60 requests/min
   - `strictRateLimiter`: 10 requests/min (敏感操作)
   - `batchRateLimiter`: 5 requests/5min (批次操作)
   - `emailRateLimiter`: 20 requests/hour (Email 發送)
   - `syncRateLimiter`: 10 requests/hour (匯率同步)

**實際應用情況**:
- ⚠️ 僅在 2 個 API 端點使用：
  - `app/api/quotations/batch/status/route.ts`
  - `app/api/quotations/batch/delete/route.ts`

**建議改進**:
```typescript
// 在更多敏感端點應用速率限制

// 登入端點 (防止暴力破解)
export async function POST(req: NextRequest) {
  return strictRateLimiter(req, async () => {
    // 登入邏輯
  })
}

// Email 發送端點
export async function POST(req: NextRequest) {
  return emailRateLimiter(req, async () => {
    // Email 發送邏輯
  })
}
```

---

### 9. ✅ Command Injection 防護

**評估**: 優秀 (10/10)

**檢查結果**:
- ✅ 未發現 `child_process.exec()` 使用
- ✅ 未發現 `child_process.spawn()` 使用
- ✅ 未發現 `child_process.execFile()` 使用

**搜尋的檔案**:
- `lib/observability/types.ts` - 僅類型定義
- `lib/db/d1-client.ts` - 資料庫客戶端
- `scripts/analyze-schema-diff.ts` - 開發工具 (不在生產環境)

**結論**: 專案不執行系統命令，無 Command Injection 風險。

---

### 10. ✅ 檔案上傳安全

**評估**: 良好 (8/10)

**已實作的安全措施**:
1. ✅ **Supabase Storage 整合**
   - 使用託管的儲存服務
   - RLS (Row Level Security) 保護

2. ✅ **檔案大小限制**:
   ```typescript
   fileSizeLimit: 10485760, // 10MB
   ```

3. ✅ **路徑隔離**:
   ```sql
   -- 使用者只能上傳到自己的目錄
   (storage.foldername(name))[1] = auth.uid()::text
   ```

4. ✅ **認證要求**:
   - 所有上傳操作需要認證
   - 使用者只能刪除自己的檔案

**建議改進**:
1. **MIME 類型驗證**:
```typescript
// 限制允許的檔案類型
allowedMimeTypes: [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
```

2. **檔案名稱消毒**:
```typescript
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255)
}
```

---

## 🔍 其他安全發現

### 11. ⚠️ 缺少安全 Headers

**嚴重程度**: 🟡 MEDIUM
**影響**: 中等

**問題描述**:
未發現安全 headers 設定。應添加以下 headers：

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://nxlqtnnssfzzpbyfjnby.supabase.co",
              "frame-ancestors 'none'"
            ].join('; ')
          }
        ]
      }
    ]
  }
}
```

---

### 12. ✅ SSRF 防護

**評估**: 良好 (8/10)

**檢查結果**:
- ✅ 僅對可信的 API 端點發送請求
- ✅ 使用固定的 URL，不接受用戶輸入
- ✅ 檢查的端點：
  - `https://api.brevo.com/v3/smtp/email` (Email 服務)
  - `https://v6.exchangerate-api.com/v6/...` (匯率 API)

**程式碼範例**:
```typescript
// lib/services/exchange-rate.ts:55-56
const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`
const response = await fetch(url)
```

**建議改進**:
如果未來需要接受用戶輸入的 URL，應實施以下檢查：
```typescript
function isAllowedUrl(url: string): boolean {
  const allowedDomains = [
    'api.brevo.com',
    'exchangerate-api.com'
  ]

  try {
    const parsed = new URL(url)
    return allowedDomains.some(domain =>
      parsed.hostname === domain ||
      parsed.hostname.endsWith(`.${domain}`)
    )
  } catch {
    return false
  }
}
```

---

### 13. ⚠️ 錯誤訊息洩漏資訊

**嚴重程度**: 🟡 LOW
**影響**: 低

**問題描述**:
部分錯誤處理可能洩漏敏感資訊：

```typescript
// lib/services/exchange-rate.ts:73
console.error('❌ 獲取匯率失敗:', { baseCurrency, error: errorMessage })
```

**建議改進**:
1. **生產環境隱藏詳細錯誤**:
```typescript
if (process.env.NODE_ENV === 'production') {
  return { error: 'Internal server error' }
} else {
  return { error: error.message, stack: error.stack }
}
```

2. **使用結構化日誌**:
```typescript
import { logger } from '@/lib/logger'

logger.error('Exchange rate fetch failed', {
  baseCurrency,
  error: error.message,
  // 不記錄可能包含密鑰的完整 error 物件
})
```

---

### 14. ✅ 密碼和密鑰處理

**評估**: 良好 (8/10)

**已實作的安全措施**:
1. ✅ **密碼雜湊**
   - 使用 Supabase Auth，自動使用 bcrypt

2. ✅ **密鑰儲存**
   - 使用環境變數
   - 不在程式碼中硬編碼

3. ✅ **API Key 保護**
   - 錯誤日誌不輸出完整 error 物件
   - 避免洩漏 API key

**需要注意的地方**:
- ⚠️ `CRON_SECRET` 和 `ADMIN_API_KEY` 使用預設值：
  ```typescript
  // .env.local.template
  CRON_SECRET=your-random-secret-for-cron-jobs
  ADMIN_API_KEY=your-admin-api-key-for-manual-sync
  ```

**建議**:
```bash
# 生成強隨機密鑰
openssl rand -base64 32
```

---

## 📋 修復優先順序

### 🔴 P0 - 立即修復 (24 小時內)

1. **撤銷並重新生成所有已洩漏的密鑰**
   - Supabase Service Role Key
   - Database Password
   - Exchange Rate API Key
   - Gmail App Password
   - Cloudflare API Token

2. **移除 .env.local.bak 和其他備份檔案**

3. **檢查 Git 歷史，確認未提交敏感資料**

### 🟡 P1 - 高優先級 (1 週內)

4. **啟用 CSRF 保護**
   - 添加 `CSRF_SECRET` 環境變數
   - 在 middleware 啟用
   - 前端添加 token

5. **修復 Open Redirect 漏洞**
   - 驗證 redirect 路徑

6. **更新依賴套件**
   - 修復 glob 套件漏洞
   - 執行 `pnpm audit fix`

7. **添加安全 Headers**
   - CSP, X-Frame-Options 等

### 🟢 P2 - 中優先級 (1 個月內)

8. **擴展速率限制應用範圍**
   - 登入端點
   - Email 發送端點
   - 所有 POST/PUT/DELETE 端點

9. **改進檔案上傳安全**
   - MIME 類型驗證
   - 檔案名稱消毒

10. **錯誤處理改進**
    - 隱藏生產環境的詳細錯誤
    - 使用結構化日誌

11. **實施 MFA (Multi-Factor Authentication)**

---

## 🛡️ 安全最佳實踐建議

### 開發流程

1. **Pre-commit Hooks**
```bash
# 安裝 git-secrets
brew install git-secrets

# 掃描敏感資料
git secrets --scan

# 防止提交密鑰
git secrets --add 'SUPABASE_SERVICE_ROLE_KEY'
git secrets --add 'DATABASE_URL'
git secrets --add 'API_KEY'
```

2. **自動化安全掃描**
```yaml
# .github/workflows/security-scan.yml
name: Security Scan
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
      - name: Run npm audit
        run: pnpm audit --audit-level=high
```

3. **密鑰輪換政策**
   - 每 90 天輪換一次密鑰
   - 使用密鑰管理服務 (AWS Secrets Manager)

### 監控和回應

1. **安全事件監控**
   - 實施 SIEM (Security Information and Event Management)
   - 監控異常登入嘗試
   - 追蹤 API 速率限制觸發

2. **漏洞回應計劃**
   - 建立安全事件回應流程
   - 定期進行安全演練
   - 維護聯絡名單

### 合規性

1. **GDPR 合規**
   - ✅ 使用者可刪除資料
   - ⚠️ 需要實施資料匯出功能
   - ⚠️ 需要隱私政策頁面

2. **OWASP Top 10 2021 對照**
   - ✅ A01:2021 – Broken Access Control (已實施 RBAC)
   - ⚠️ A02:2021 – Cryptographic Failures (需要撤銷洩漏的密鑰)
   - ✅ A03:2021 – Injection (已使用參數化查詢)
   - ⚠️ A04:2021 – Insecure Design (需要啟用 CSRF)
   - ✅ A05:2021 – Security Misconfiguration (需要添加安全 headers)
   - ✅ A06:2021 – Vulnerable Components (需要更新依賴)
   - ✅ A07:2021 – Identification & Authentication Failures (良好)
   - ⚠️ A08:2021 – Software and Data Integrity Failures (需要 SRI)
   - ✅ A09:2021 – Security Logging & Monitoring (已實施)
   - ✅ A10:2021 – Server-Side Request Forgery (良好)

---

## 📚 參考資源

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP ASVS (Application Security Verification Standard)](https://owasp.org/www-project-application-security-verification-standard/)
- [CWE Top 25 Most Dangerous Software Weaknesses](https://cwe.mitre.org/top25/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Next.js Security Headers](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)

---

## 📞 聯絡資訊

如有安全問題或發現漏洞，請通過以下方式報告：
- Email: security@yourdomain.com
- 加密通訊: [PGP Key]

---

**審查完成日期**: 2025-11-23
**下次審查建議**: 2025-12-23 (30 天後)
