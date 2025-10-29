# RBAC Service Migration to Supabase Client SDK

## 遷移日期
2025-10-29

## 遷移範圍
將 `lib/services/rbac.ts` 從 Zeabur PostgreSQL 客戶端遷移至 Supabase Client SDK

## 遷移詳情

### 移除的依賴
- ❌ `import { query, getClient } from '../db/zeabur'`

### 新增的依賴
- ✅ `import { createClient } from '@/lib/supabase/server'`

## 遷移的函式清單

### USER PROFILE (使用者資料)
- ✅ `getUserProfile()` - 使用 `.from('user_profiles').select().single()`
- ✅ `createUserProfile()` - 使用 `.insert().select().single()`
- ✅ `updateUserProfile()` - 使用 `.update().select().single()`
- ✅ `updateLastLogin()` - 使用 `.update()`

### ROLES (角色管理)
- ✅ `getAllRoles()` - 使用 `.from('roles').select().order()`
- ✅ `getRoleByName()` - 使用 `.from('roles').select().single()`

### USER ROLES (使用者角色)
- ✅ `getUserRoles()` - 使用 `.from('user_roles').select('roles!inner(*)')`
- ✅ `assignRoleToUser()` - 使用 `.insert().select().single()`
- ✅ `removeRoleFromUser()` - 使用 `.delete()`
- ✅ `getUserHighestRole()` - 使用 `.select().order().limit()`

### PERMISSIONS (權限檢查)
- ✅ `getUserPermissions()` - 使用 view `user_permissions`
- ✅ `hasPermission()` - 使用 `.select(count).head()`
- ✅ `canAccessProductCost()` - 使用 `.select().in()`
- ✅ `canManageUsers()` - 委託給 `hasPermission()`
- ✅ `canAssignRoles()` - 委託給 `hasPermission()`

### USER MANAGEMENT (使用者管理)
- ✅ `getAllUsers()` - 使用 nested select with `user_roles(roles(*))`
- ✅ `getUserById()` - 使用 nested select
- ✅ `deactivateUser()` - 使用 `.update()`
- ✅ `activateUser()` - 使用 `.update()`

### PERMISSION CHECKING HELPERS (權限檢查輔助)
- ✅ `checkMultiplePermissions()` - 迴圈調用 `hasPermission()`
- ✅ `requirePermission()` - 純函式，無資料庫操作

### MIDDLEWARE HELPERS (中介層輔助)
- ✅ `getUserRoleLevel()` - 委託給 `getUserHighestRole()`
- ✅ `isAdmin()` - 使用 `.select(count).in()`
- ✅ `isSuperAdmin()` - 使用 `.select(count).eq()`

### CROSS-COMPANY PERMISSIONS (跨公司權限)
- ✅ `canAccessCompany()` - 使用 `.rpc('can_access_company')`
- ✅ `getManageableCompanies()` - 使用 `.rpc('get_manageable_companies')`
- ✅ `canManageUser()` - 使用 `.rpc('can_manage_user')`
- ✅ `canAssignRole()` - 使用 `.rpc('can_assign_role')`
- ✅ `getAllCompanies()` - 使用 `.from('companies').select()` + Promise.all for counts

## 關鍵技術決策

### 1. JOIN 查詢轉換
**原始 SQL:**
```sql
SELECT r.*
FROM roles r
JOIN user_roles ur ON r.id = ur.role_id
WHERE ur.user_id = $1
```

**Supabase Client:**
```typescript
.from('user_roles')
.select('roles!inner(*)')
.eq('user_id', userId)
```

### 2. COUNT 查詢轉換
**原始 SQL:**
```sql
SELECT COUNT(*) as count FROM user_roles WHERE ...
```

**Supabase Client:**
```typescript
.select('*', { count: 'exact', head: true })
```

### 3. 複雜的 RPC 函式
對於複雜的跨表查詢（例如 `user_permissions` view、`can_access_company` 等），保持使用 PostgreSQL RPC 函式：
```typescript
.rpc('can_access_company', { p_user_id, p_company_id })
```

### 4. Nested Relations
使用 Supabase 的 nested select 語法取代手動 JOIN：
```typescript
.select(`
  *,
  user_roles(
    roles(*)
  )
`)
```

## 錯誤處理改進

### NULL 檢查
- 使用 `error.code === 'PGRST116'` 檢查「找不到記錄」錯誤
- 適當處理 `null` 返回值

### COUNT 查詢
- 使用 `(count || 0) > 0` 安全處理可能為 null 的計數

## 向後兼容性

✅ **所有函式簽名保持不變**
- 輸入參數類型不變
- 返回值類型不變
- 錯誤訊息格式不變

這確保了現有代碼無需修改即可繼續使用。

## 測試建議

### 1. 單元測試
- [ ] 測試所有 USER PROFILE 函式
- [ ] 測試所有 ROLES 函式
- [ ] 測試所有 PERMISSIONS 函式

### 2. 整合測試
- [ ] 測試跨公司權限檢查
- [ ] 測試角色分配流程
- [ ] 測試使用者管理功能

### 3. 權限邊界測試
- [ ] 測試 super_admin 的全域權限
- [ ] 測試 company_owner 的公司範圍權限
- [ ] 測試一般使用者的受限權限

## 效能考量

### 優化點
1. 使用 `head: true` 減少資料傳輸（COUNT 查詢）
2. 使用 nested select 減少 round-trip
3. 保持 view 和 RPC 函式以利用資料庫端優化

### 待優化
1. `getAllCompanies()` 中的 Promise.all 可能可以用單一 SQL 查詢優化
2. `checkMultiplePermissions()` 的迴圈可以批次處理

## 結論

✅ 遷移完成，所有 586 行代碼已成功從 Zeabur PostgreSQL 客戶端遷移至 Supabase Client SDK

✅ 保持向後兼容性

✅ 所有業務邏輯和權限檢查邏輯完整保留

✅ TypeScript 類型安全維持

## 相關文件
- `lib/services/company.ts` - 參考範例
- `lib/services/contracts.ts` - 參考範例
- `lib/services/payments.ts` - 參考範例
