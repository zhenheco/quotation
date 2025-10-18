# Issue Log

此檔案記錄專案開發過程中遇到的所有錯誤、問題及其解決方案。

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

## 問題統計

- **總問題數**: 1
- **已解決**: 1
- **進行中**: 0
- **未解決**: 0

### 按嚴重程度

- 🔴 Critical: 1 (已解決)
- 🟡 Medium: 0
- 🟢 Low: 0
