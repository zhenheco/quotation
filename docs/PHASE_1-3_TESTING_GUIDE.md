# Phase 1-3 測試指南

本文檔說明如何測試已完成的 Phase 1-3 功能。

## 測試環境需求

- ✅ 開發伺服器運行中 (`npm run dev`)
- ✅ 資料庫已執行 migration 005
- ✅ 至少有一個使用者帳號可以登入
- ✅ 建議設定 acejou27@gmail.com 為超級管理員

## 快速測試方式

### 方式 1：使用測試頁面（推薦）

1. **啟動開發伺服器**
   ```bash
   npm run dev
   ```

2. **登入系統**
   - 前往 http://localhost:3000/login （或 3001，視 port 而定）
   - 使用您的帳號登入

3. **開啟測試頁面**
   - 前往 http://localhost:3000/test-permissions
   - 點擊「🧪 執行所有測試」按鈕

4. **檢查測試結果**
   - ✅ 綠色勾勾表示測試通過
   - ❌ 紅色叉叉表示測試失敗
   - 查看每個區塊的狀態

### 方式 2：手動測試 API

使用瀏覽器的開發者工具或 Postman：

1. **取得 Access Token**
   - 登入後，開啟瀏覽器的開發者工具
   - Application > Local Storage
   - 找到 Supabase session token

2. **測試 API 端點**

```bash
# 取得使用者權限
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/user/permissions

# 取得使用者公司
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/user/companies

# 取得可管理的公司
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/company/manageable
```

## 詳細測試項目

### Phase 1: 資料庫與後端

#### ✅ 測試 1：檢查資料庫結構

```sql
-- 檢查角色是否正確建立
SELECT * FROM roles ORDER BY level;

-- 檢查權限是否正確建立
SELECT * FROM permissions ORDER BY permission_name;

-- 檢查角色權限關聯
SELECT r.role_name, p.permission_name
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
ORDER BY r.level, p.permission_name;

-- 檢查超級管理員設定
SELECT * FROM user_profiles WHERE user_id = '00000000-0000-0000-0000-000000000001';
SELECT * FROM user_roles WHERE user_id = '00000000-0000-0000-0000-000000000001';
```

#### ✅ 測試 2：檢查 RLS 政策

```sql
-- 檢查公司的 RLS 政策
SELECT * FROM pg_policies WHERE tablename = 'companies';

-- 檢查公司成員的 RLS 政策
SELECT * FROM pg_policies WHERE tablename = 'company_members';
```

#### ✅ 測試 3：測試資料庫函數

```sql
-- 測試 can_access_company 函數
SELECT can_access_company('YOUR_USER_ID', 'COMPANY_ID');

-- 測試 get_manageable_companies 函數
SELECT * FROM get_manageable_companies('YOUR_USER_ID');

-- 測試 can_manage_user 函數
SELECT can_manage_user('ADMIN_USER_ID', 'TARGET_USER_ID');

-- 測試 can_assign_role 函數
SELECT can_assign_role('ADMIN_USER_ID', 'salesperson', 'COMPANY_ID');
```

### Phase 2: API 端點

#### ✅ 測試 4：使用者 API

**GET /api/user/permissions**
- 預期：回傳使用者的完整權限資訊
- 測試項目：
  - ✅ HTTP 200 狀態碼
  - ✅ 包含 `is_super_admin` 欄位
  - ✅ 包含 `global_permissions` 陣列
  - ✅ 包含 `companies` 陣列

**GET /api/user/companies**
- 預期：回傳使用者所屬公司列表
- 測試項目：
  - ✅ HTTP 200 狀態碼
  - ✅ 包含 `companies` 陣列
  - ✅ 包含 `total` 數量

#### ✅ 測試 5：公司管理 API

**GET /api/company/manageable**
- 預期：回傳可管理的公司列表
- 測試：
  - 超級管理員應看到所有公司
  - 一般使用者只看到所屬公司

**GET /api/company/[id]/members**
- 預期：回傳公司成員列表
- 測試：
  - ✅ 成員有權限查看
  - ❌ 非成員應 403 錯誤

**POST /api/company/[id]/members**
- 預期：新增成員到公司
- 測試：
  - ✅ Owner 可以新增
  - ✅ 超管可以新增
  - ❌ 一般成員應 403 錯誤

**PATCH /api/company/[id]/members/[userId]**
- 預期：更新成員角色
- 測試：
  - ✅ Owner 可以更新
  - ❌ 不能更改 owner 角色
  - ❌ 一般成員應 403 錯誤

**DELETE /api/company/[id]/members/[userId]**
- 預期：移除成員（軟刪除）
- 測試：
  - ✅ Owner 可以移除
  - ❌ 不能移除 owner
  - ❌ 一般成員應 403 錯誤

#### ✅ 測試 6：超管 API

**GET /api/admin/companies**
- 預期：取得所有公司列表
- 測試：
  - ✅ 超管可以存取
  - ❌ 非超管應 403 錯誤

**GET /api/admin/companies/[id]**
- 預期：取得公司詳細資訊
- 測試：
  - ✅ 包含公司基本資料
  - ✅ 包含統計資料
  - ✅ 包含 owner 資訊

**POST /api/admin/companies/[id]/members**
- 預期：超管為任何公司新增成員
- 測試：
  - ✅ 超管可以新增
  - ❌ 非超管應 403 錯誤

**GET /api/admin/users**
- 預期：取得所有使用者列表
- 測試：
  - ✅ 超管可以存取
  - ✅ 包含使用者所屬公司資訊

**PATCH /api/admin/users/[id]/role**
- 預期：超管更新使用者角色
- 測試：
  - ✅ 超管可以更新
  - ✅ 可以指定公司角色
  - ❌ 非超管應 403 錯誤

### Phase 3: Hooks 與組件

#### ✅ 測試 7：Hooks

**usePermissions**
- 測試：
  - ✅ 正確載入權限資料
  - ✅ `hasPermission()` 正確判斷權限
  - ✅ `isSuperAdmin` 正確判斷超管
  - ✅ `isCompanyOwner()` 正確判斷 owner
  - ✅ `getCompanyRole()` 正確回傳角色

**useCompanies**
- 測試：
  - ✅ 正確載入公司列表
  - ✅ `getCompany()` 正確取得公司
  - ✅ `refetch()` 可以重新載入

**useManageableCompanies**
- 測試：
  - ✅ 正確載入可管理公司
  - ✅ `canManageCompany()` 正確判斷
  - ✅ `canManageMembers()` 正確判斷

**useCompanyMembers**
- 測試：
  - ✅ 正確載入成員列表
  - ✅ `addMember()` 可以新增成員
  - ✅ `updateMemberRole()` 可以更新角色
  - ✅ `removeMember()` 可以移除成員

#### ✅ 測試 8：組件

**RequirePermission**
- 測試：
  - ✅ 有權限時顯示內容
  - ✅ 無權限時顯示 fallback
  - ✅ SuperAdminOnly 正確運作
  - ✅ CompanyOwnerOnly 正確運作

**CompanySelector**
- 測試：
  - ✅ 正確顯示公司列表
  - ✅ 可以選擇公司
  - ✅ onChange 回調正常
  - ✅ 自動選擇第一個公司

**RoleSelector**
- 測試：
  - ✅ 正確顯示角色列表
  - ✅ 可以選擇角色
  - ✅ 顯示角色描述
  - ✅ excludeOwner 正常運作

**RoleBadge**
- 測試：
  - ✅ 正確顯示角色徽章
  - ✅ 顏色對應正確

**MemberList**
- 測試：
  - ✅ 正確顯示成員列表
  - ✅ 可以編輯成員角色
  - ✅ 可以移除成員
  - ✅ Owner 不能被編輯/移除
  - ✅ 無權限時禁用編輯功能

## 預期結果

### 超級管理員測試結果

- ✅ 可以看到所有公司
- ✅ 可以管理所有公司的成員
- ✅ 可以新增成員到任何公司
- ✅ 可以更新任何使用者的角色
- ✅ 可以存取所有超管 API

### 公司 Owner 測試結果

- ✅ 可以看到自己的公司
- ✅ 可以管理自己公司的成員
- ✅ 可以新增成員到自己的公司
- ✅ 可以更新成員角色（除了 owner）
- ✅ 可以移除成員（除了 owner）
- ❌ 不能存取超管 API
- ❌ 不能管理其他公司

### 一般使用者測試結果

- ✅ 可以看到自己所屬的公司
- ✅ 可以看到自己的權限
- ❌ 不能管理公司成員
- ❌ 不能存取超管 API
- ❌ 不能新增/移除成員

## 常見問題

### Q1: 測試頁面顯示 401 Unauthorized

**解答**：請確認已登入系統。如果已登入但仍出現此錯誤，可能是 session 過期，請重新登入。

### Q2: API 回傳 403 Forbidden

**解答**：這是正常的權限檢查。確認您的帳號是否有足夠的權限執行該操作。

### Q3: 無法看到任何公司

**解答**：
1. 確認資料庫中有公司資料
2. 確認使用者已被加入到公司（company_members 表）
3. 檢查 RLS 政策是否正確啟用

### Q4: 超管功能無法使用

**解答**：
1. 確認 user_roles 表中有超管角色記錄
2. 確認角色名稱為 'super_admin'
3. 檢查 migration 005 是否正確執行

### Q5: 成員列表為空

**解答**：
1. 確認公司 ID 正確
2. 確認 company_members 表中有資料
3. 檢查 RLS 政策

## 測試完成檢查清單

請確認以下項目全部打勾後，才能進入 Phase 4：

### 資料庫 (Phase 1)
- [ ] Migration 005 執行成功
- [ ] 5 個角色已建立
- [ ] 14 個權限已建立
- [ ] 超級管理員帳號已設定
- [ ] RLS 政策已啟用
- [ ] 資料庫函數正常運作

### API 端點 (Phase 2)
- [ ] 所有 11 個 API 端點編譯成功
- [ ] 使用者 API 正常運作 (2個)
- [ ] 公司管理 API 正常運作 (4個)
- [ ] 超管 API 正常運作 (5個)
- [ ] 權限檢查正確執行
- [ ] 錯誤處理正常

### Hooks 與組件 (Phase 3)
- [ ] 4 個 Hooks 編譯成功
- [ ] 4 個組件編譯成功
- [ ] usePermissions 正常運作
- [ ] useCompanies 正常運作
- [ ] useManageableCompanies 正常運作
- [ ] useCompanyMembers 正常運作
- [ ] RequirePermission 組件正常
- [ ] CompanySelector 組件正常
- [ ] RoleSelector 組件正常
- [ ] MemberList 組件正常

## 下一步

當所有測試項目都通過後，即可進入：

**Phase 4：實作超級管理員控制台介面**
- 建立超管專用的管理頁面
- 實作公司列表管理
- 實作使用者列表管理
- 實作全域角色管理

---

**測試人員**: _____________
**測試日期**: _____________
**測試結果**: ⬜ 全部通過 ⬜ 部分失敗 ⬜ 需要修正
**備註**: _____________________________________________
