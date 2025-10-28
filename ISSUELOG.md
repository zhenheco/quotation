# Issue Log

此檔案記錄專案開發過程中遇到的所有錯誤、問題及其解決方案。

---

## [ISSUE-014] - 2025-10-28: Cloudflare Workers 部署 - standalone 目錄結構錯誤

**狀態**: ✅ Resolved

**嚴重程度**: 🔴 Critical (阻止部署)

### 錯誤描述

OpenNext Cloudflare 建置時找不到 pages-manifest.json：
```
Error: ENOENT: no such file or directory, open '/Users/avyshiu/Claudecode/quotation-system/.next/standalone/.next/server/pages-manifest.json'
```

### 發生位置

- 工具: `opennextjs-cloudflare build`
- 預期路徑: `.next/standalone/.next/server/pages-manifest.json`
- 實際路徑: `.next/standalone/Claudecode/quotation-system/.next/server/pages-manifest.json`

### 根本原因分析

1. **Workspace root 推斷錯誤**: Next.js 偵測到多個 lockfiles：
   - `/Users/avyshiu/package-lock.json` (被誤認為 root)
   - `/Users/avyshiu/Claudecode/quotation-system/pnpm-lock.yaml` (正確的專案 root)

2. **Standalone 輸出結構**: Next.js 使用推斷的 root 作為基準，導致輸出完整路徑：
   ```
   .next/standalone/Claudecode/quotation-system/.next/  (錯誤)
   .next/standalone/.next/                             (正確)
   ```

### 解決方案

在 `next.config.ts` 加上 `outputFileTracingRoot` 設定：

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: '/Users/avyshiu/Claudecode/quotation-system',  // 明確指定專案 root
  // ... 其他設定
};
```

### 驗證步驟

1. 清除舊的 build：
   ```bash
   rm -rf .next .open-next
   ```

2. 重新建置：
   ```bash
   pnpm run build
   ```

3. 驗證 standalone 結構：
   ```bash
   ls .next/standalone/.next/server/pages-manifest.json
   ```

4. 打包並部署：
   ```bash
   pnpm exec opennextjs-cloudflare build --skipBuild
   pnpm exec opennextjs-cloudflare deploy
   ```

### 結果

✅ 部署成功：https://quotation-system.acejou27.workers.dev
- 首頁: 307 重定向到 `/zh/login`
- 登入頁: 200 狀態碼

### 學到的教訓

1. 多個 lockfiles 會導致 Next.js workspace root 推斷錯誤
2. 使用 `outputFileTracingRoot` 明確指定專案根目錄
3. OpenNext 需要正確的 standalone 目錄結構才能正常工作

---

## [ISSUE-001] - 2025-10-18: 建置錯誤 - Module not found: '@/lib/auth'

**狀態**: ✅ Resolved

**嚴重程度**: 🔴 Critical (阻止建置)

### 錯誤描述

建置時出現模組找不到的錯誤：
```
Module not found: Can't resolve '@/lib/auth'
```

### 發生位置

- 檔案: `app/api/payments/unpaid/route.ts:9` (及其他 9 個檔案)
- 環境: Development Build (Next.js 15.5.5 with Turbopack)

### 相關檔案

受影響的檔案：
1. `app/api/payments/route.ts`
2. `app/api/payments/unpaid/route.ts`
3. `app/api/payments/collected/route.ts`
4. `app/api/payments/reminders/route.ts`
5. `app/api/payments/[id]/mark-overdue/route.ts`
6. `app/api/contracts/overdue/route.ts`
7. `app/api/contracts/[id]/payment-progress/route.ts`
8. `app/api/contracts/[id]/next-collection/route.ts`
9. `app/api/contracts/from-quotation/route.ts`
10. `lib/middleware/withPermission.ts`

### 根本原因分析

1. **架構不一致**: 專案同時使用兩種認證系統：
   - ✅ Supabase Auth (正確) - 已配置在 `lib/supabase/server.ts`
   - ❌ NextAuth (錯誤) - 未安裝但被引用

2. **缺少檔案**: `lib/auth.ts` 檔案不存在，但多個 API 路由引用了它

3. **錯誤的 import**:
   ```typescript
   import { getServerSession } from 'next-auth';  // ❌ 錯誤：next-auth 未安裝
   import { authOptions } from '@/lib/auth';      // ❌ 錯誤：檔案不存在
   ```

4. **為什麼不安裝 NextAuth**:
   - 嘗試安裝 `next-auth` 時發生依賴衝突
   - 專案使用 `nodemailer@7.0.9`，但 `next-auth@4.24.11` 需要 `nodemailer@^6.6.5`
   - 專案已有完整的 Supabase Auth 配置，不需要 NextAuth

### 解決方案

**步驟 1**: 創建 `lib/auth.ts` 作為 Supabase Auth 的封裝

創建了一個提供 NextAuth 兼容介面的檔案，但實際使用 Supabase Auth：

```typescript
// lib/auth.ts
import { createClient } from '@/lib/supabase/server';

export interface Session {
  user: {
    id: string;
    email?: string;
    name?: string;
    image?: string;
  };
}

export async function getServerSession(): Promise<Session | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return null;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0],
      image: user.user_metadata?.avatar_url,
    },
  };
}
```

**步驟 2**: 更新所有 API 路由和 middleware

批量替換所有檔案中的 import：
```bash
# 更新 import 來源
from 'next-auth' → from '@/lib/auth'

# 移除 authOptions import
刪除: import { authOptions } from '@/lib/auth';

# 簡化函數調用
getServerSession(authOptions) → getServerSession()
```

**步驟 3**: 驗證修復

- ✅ 所有 API 路由現在使用正確的 Supabase Auth
- ✅ 保持了原有的 API 介面（session.user.id 等）
- ✅ 不需要安裝額外的套件
- ✅ 避免了依賴衝突

### 預防措施

1. **架構決策文件化**:
   - 在 README.md 中明確說明使用 Supabase Auth
   - 在新開發者 onboarding 文件中說明認證架構

2. **Code Review 檢查點**:
   - 禁止引入 `next-auth` 套件
   - 確保所有認證相關的 import 都來自 `@/lib/auth` 或 `@/lib/supabase/*`

3. **TypeScript 型別檢查**:
   - `lib/auth.ts` 提供了明確的型別定義
   - 確保 Session 介面在整個專案中一致

4. **測試覆蓋**:
   - 為 `lib/auth.ts` 添加單元測試
   - 測試認證失敗的情況

### 相關資源

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js 15 Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- 專案檔案: `lib/supabase/server.ts` - Supabase client 配置
- 專案檔案: `lib/middleware/withAuth.ts` - Supabase Auth middleware

### 學到的教訓

1. **一致性很重要**: 混合使用不同的認證系統會造成混亂
2. **依賴管理**: 在添加新套件前，檢查是否與現有依賴衝突
3. **優先使用現有解決方案**: 專案已有 Supabase Auth，不需要額外的認證庫
4. **文件化架構決策**: 清楚記錄為什麼選擇特定技術

---

## [ISSUE-002] - 2025-10-28: Cloudflare Workers 部署錯誤 - Failed to load chunk server

**狀態**: ✅ Resolved

**嚴重程度**: 🔴 Critical (阻止 Cloudflare Workers 運行)

### 錯誤描述

部署到 Cloudflare Workers 後，所有頁面返回 500 Internal Server Error：
```
Error: Failed to load chunk server/chunks/ssr/[root-of-the-server]__768361fc._.js from runtime for chunk server/app/page.js
Error: Failed to load chunk server/chunks/ssr/[root-of-the-server]__9285a355._.js from runtime for chunk server/pages/_document.js
```

### 發生位置

- 環境: Cloudflare Workers (Production)
- URL: https://quotation-system.acejou27.workers.dev
- 所有路徑都受影響

### 根本原因分析

1. **使用了 Turbopack 構建**:
   - `package.json` 中的 `build` 腳本使用了 `--turbopack` 標誌
   - OpenNext Cloudflare 不支持 Turbopack 構建的輸出

2. **為什麼 Turbopack 不相容**:
   - Turbopack 使用與 Webpack 不同的 chunk 分割策略
   - OpenNext 的 Cloudflare 適配器期望 Webpack 的輸出格式
   - Cloudflare Workers 需要所有檔案在構建時打包，不支持運行時動態載入

3. **官方文檔確認**:
   - OpenNext Troubleshooting 文檔明確說明不支持 Turbopack
   - 必須使用 `next build` 而非 `next build --turbo`

### 解決方案

**步驟 1**: 移除 Turbopack 標誌

修改 `package.json`:
```diff
  "scripts": {
    "dev": "next dev --turbopack",
-   "build": "next build --turbopack",
+   "build": "next build",
    "start": "next start",
```

**步驟 2**: 清理舊構建並重新部署

```bash
rm -rf .next .open-next
pnpm run deploy:cf
```

**步驟 3**: 驗證部署成功

- ✅ 首頁返回 307 重定向（正確行為）
- ✅ `/zh/login` 返回 200 狀態碼
- ✅ 頁面標題正確顯示
- ✅ 沒有 500 錯誤

### 技術細節

1. **構建輸出差異**:
   - Webpack 構建: 傳統的 chunk 格式，OpenNext 支持
   - Turbopack 構建: 新的優化格式，OpenNext 尚未支持

2. **Cloudflare Workers 限制**:
   - 不支持檔案系統 API
   - 所有資源必須在構建時打包
   - 動態 import 需要特殊處理

3. **OpenNext 版本**:
   - `@opennextjs/cloudflare`: 1.11.0
   - Next.js: 15.5.5
   - 需要 compatibility_date: 2025-03-25 或更新

### 預防措施

1. **CI/CD 檢查**:
   - 在部署前檢查 build 腳本是否包含 `--turbopack`
   - 添加 lint 規則檢查 package.json

2. **文檔更新**:
   - 在 README 中說明 Cloudflare 部署限制
   - 記錄 dev 和 build 腳本的不同用途

3. **監控**:
   - 使用 `wrangler tail` 監控部署後的日誌
   - 設置 Cloudflare Workers 錯誤告警

### 驗證步驟

部署後執行以下檢查：
```bash
# 檢查首頁
curl -I https://quotation-system.acejou27.workers.dev

# 檢查登入頁
curl -I https://quotation-system.acejou27.workers.dev/zh/login

# 查看實時日誌
pnpm exec wrangler tail quotation-system
```

### 相關資源

- [OpenNext Cloudflare Troubleshooting](https://opennext.js.org/cloudflare/troubleshooting)
- [Cloudflare Workers Compatibility](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Next.js Turbopack Documentation](https://nextjs.org/docs/architecture/turbopack)

### 學到的教訓

1. **不是所有 Next.js 功能都能在邊緣運行**: Turbopack 是為本地開發優化的
2. **閱讀平台文檔很重要**: OpenNext 文檔明確說明了不支持 Turbopack
3. **保持 dev 和 production 一致**: 雖然 dev 用 Turbopack 更快，但 production 必須用 Webpack
4. **部署前測試**: 使用 `pnpm run preview:cf` 在本地測試 Cloudflare Workers

---

## 問題統計

- **總問題數**: 2
- **已解決**: 2
- **進行中**: 0
- **未解決**: 0

### 按嚴重程度

- 🔴 Critical: 2 (已解決)
- 🟡 Medium: 0
- 🟢 Low: 0
