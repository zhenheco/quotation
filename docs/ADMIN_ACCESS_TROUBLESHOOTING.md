# Admin 控制台訪問問題排查指南

## 🎯 目標

本文檔記錄 admin 控制台訪問問題的完整排查過程和解決方案。

---

## 🐛 問題描述

### 問題 1: 訪問 /admin 重定向到 /zh/dashboard

**現象**：
- 訪問 `http://localhost:3001/admin`
- 自動重定向到 `http://localhost:3001/zh/dashboard`
- 無法訪問超級管理員控制台

**預期行為**：
- 應該顯示超級管理員控制台 dashboard

### 問題 2: npm run seed:admin 執行失敗

**現象**：
```bash
npm run seed:admin
sh: tsx: command not found
```

---

## 🔍 問題根本原因分析

### 1. Admin 路由重定向問題

經過深入調查，發現了完整的重定向鏈路：

```
步驟 1: 用戶訪問 /admin
↓
步驟 2: middleware.ts 檢查 - /admin 在 shouldSkipIntl 列表中，不加 locale 前綴 ✅
↓
步驟 3: app/admin/layout.tsx 執行權限檢查
  - 檢查用戶是否登入 ✅
  - 呼叫 isSuperAdmin(userId) 檢查是否為超級管理員 ❌
  - 因為用戶沒有 super_admin 角色，返回 false
↓
步驟 4: redirect('/?error=unauthorized')
↓
步驟 5: app/page.tsx 執行
  - 無條件 redirect('/zh/login')
↓
步驟 6: app/[locale]/login/page.tsx 執行
  - 檢查用戶是否已登入 ✅
  - 因為用戶已登入，redirect(`/${locale}/dashboard`)
↓
結果: 最終重定向到 /zh/dashboard
```

**關鍵發現**：
1. ✅ middleware.ts 的 i18n 處理是正確的
2. ✅ admin/layout.tsx 的權限檢查邏輯是正確的
3. ✅ rbac.ts 的 SQL 查詢使用正確的欄位名稱 (`r.name`)
4. ❌ **核心問題**：訪問 /admin 的用戶沒有 super_admin 角色

### 2. 數據庫架構確認

**roles 表結構**：
```sql
id              | uuid
name            | varchar  ← 正確欄位名稱
name_zh         | varchar
name_en         | varchar
level           | integer
description     | text
created_at      | timestamptz
updated_at      | timestamptz
```

**user_profiles 表結構**：
```sql
id              | uuid
user_id         | uuid
full_name       | varchar
display_name    | varchar
phone           | varchar
department      | varchar
avatar_url      | text
is_active       | boolean
last_login_at   | timestamptz
created_at      | timestamptz
updated_at      | timestamptz
```

**現有角色**：
- `super_admin` (level 1) - 超級管理員
- `company_owner` (level 2) - 公司擁有者
- `sales_manager` (level 3) - 業務經理
- `salesperson` (level 4) - 業務人員
- `accountant` (level 5) - 會計

### 3. 現有用戶狀態

執行 `npx tsx scripts/check-admin-role.ts` 的結果：

```
找到 5 個用戶：
1. 會計 (accountant)
2. 測試用戶 (無角色)
3. 業務 (salesperson)
4. 老闆 (company_owner)
5. 系統管理員 (super_admin) ← 已有一個 super_admin
```

**重要發現**：
- ❌ `acejou27@gmail.com` **不在用戶列表中**
- 這表示此 email 尚未透過 Google OAuth 登入過系統

---

## ✅ 解決方案

### 方案 A: 為 acejou27@gmail.com 分配 super_admin 角色（推薦）

#### 步驟 1: 使用 acejou27@gmail.com 登入系統

1. 訪問登入頁面：
   ```
   http://localhost:3001/login
   ```

2. 點擊「使用 Google 登入」

3. 選擇 `acejou27@gmail.com` 帳號

4. 登入成功後：
   - 系統會自動在 Supabase Auth 建立用戶記錄
   - 觸發 webhook 在 user_profiles 建立記錄
   - 此時用戶在數據庫中有記錄，但還沒有任何角色

#### 步驟 2: 列出所有用戶，找到你的 user_id

```bash
export ZEABUR_POSTGRES_URL='postgresql://root:kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W@43.159.54.250:30428/zeabur'
npx tsx scripts/assign-super-admin.ts
```

輸出示例：
```
找到 6 個用戶：

1. User ID: 70c46deb-efa9-4f25-be61-fa6747a4f38c
   名稱: 會計
   角色: accountant

...

6. User ID: abc123-your-user-id
   名稱: Your Name
   角色: (無角色)  ← 這是你剛登入的帳號
```

#### 步驟 3: 為你的用戶分配 super_admin 角色

複製你的 user_id，然後執行：

```bash
export ZEABUR_POSTGRES_URL='postgresql://root:kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W@43.159.54.250:30428/zeabur'
npx tsx scripts/assign-super-admin.ts <你的user_id>
```

#### 步驟 4: 驗證角色分配

腳本會自動驗證並顯示：

```
✅ super_admin 角色已成功分配！

✅ 步驟 5: 驗證角色分配...
   Your Name 的角色:
   ✓ super_admin

🎉 完成！現在可以訪問超級管理員控制台了:
   http://localhost:3001/admin
```

#### 步驟 5: 測試訪問

訪問 admin 控制台：
```
http://localhost:3001/admin
```

應該能看到：
- ✅ 超級管理員 dashboard
- ✅ 公司管理頁面
- ✅ 用戶管理頁面
- ✅ 統計資料

### 方案 B: 使用現有的系統管理員帳號（暫時方案）

如果你想快速測試，可以使用數據庫中已存在的系統管理員帳號：

1. 查詢系統管理員的 user_id：
   ```bash
   export ZEABUR_POSTGRES_URL='postgresql://root:kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W@43.159.54.250:30428/zeabur'
   npx tsx scripts/check-admin-role.ts
   ```

2. 找到 `系統管理員 (super_admin)` 的 user_id

3. 在 Supabase Auth Dashboard 中查找對應的 email

4. 使用那個 email 登入系統

5. 訪問 `/admin`

---

## 🛠️ 修復 seed:admin 腳本問題

### 問題

```bash
npm run seed:admin
> tsx scripts/seed-admin-test-data.ts
sh: tsx: command not found
```

### 原因

`tsx` 命令在 shell 環境中找不到。

### 解決方案

使用 `npx tsx` 代替直接呼叫 `tsx`：

```bash
# 直接執行（推薦）
export ZEABUR_POSTGRES_URL='postgresql://root:kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W@43.159.54.250:30428/zeabur'
npx tsx scripts/seed-admin-test-data.ts

# 或者更新 package.json
"seed:admin": "npx tsx scripts/seed-admin-test-data.ts"
```

---

## 📝 相關腳本說明

### check-admin-role.ts

**功能**：
- 檢查 roles 表結構
- 列出所有角色
- 列出所有用戶及其角色
- 找出所有 super_admin 用戶

**使用方式**：
```bash
export ZEABUR_POSTGRES_URL='postgresql://root:kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W@43.159.54.250:30428/zeabur'
npx tsx scripts/check-admin-role.ts
```

### assign-super-admin.ts

**功能**：
- 列出所有用戶（不帶參數時）
- 為指定用戶分配 super_admin 角色（帶 user_id 參數時）

**使用方式**：
```bash
# 列出所有用戶
export ZEABUR_POSTGRES_URL='postgresql://root:kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W@43.159.54.250:30428/zeabur'
npx tsx scripts/assign-super-admin.ts

# 為特定用戶分配角色
export ZEABUR_POSTGRES_URL='postgresql://root:kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W@43.159.54.250:30428/zeabur'
npx tsx scripts/assign-super-admin.ts <user_id>
```

### seed-admin-test-data.ts

**功能**：
- 建立 5 間測試公司
- 建立 10 個測試用戶（需要先登入）
- 分配角色和公司關係

**使用方式**：
```bash
export ZEABUR_POSTGRES_URL='postgresql://root:kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W@43.159.54.250:30428/zeabur'
npx tsx scripts/seed-admin-test-data.ts
```

---

## ✅ 驗證清單

完成設定後，請確認以下項目：

### Admin 訪問測試
- [ ] 使用 super_admin 帳號登入
- [ ] 訪問 `/admin` 不會重定向
- [ ] 能看到 admin dashboard
- [ ] 能訪問公司管理頁面 `/admin/companies`
- [ ] 能訪問用戶管理頁面 `/admin/users`

### 權限測試
- [ ] 非 super_admin 用戶訪問 `/admin` 會被重定向
- [ ] 未登入用戶訪問 `/admin` 會被導向登入頁

### 數據顯示測試
- [ ] Dashboard 顯示正確的統計數字
- [ ] 公司列表顯示所有公司
- [ ] 用戶列表顯示所有用戶
- [ ] 點擊「查看詳情」能進入詳情頁

---

## 📚 相關文檔

- `docs/ADMIN_TEST_DATA_SETUP.md` - 測試資料設定指南
- `docs/PHASE_4_SUMMARY.md` - Phase 4 開發摘要
- `docs/PHASE_4_TESTING_GUIDE.md` - 完整測試指南
- `CHANGELOG.md` - 變更記錄

---

## 🎉 總結

**問題根本原因**：
- 訪問 /admin 的用戶沒有 super_admin 角色
- acejou27@gmail.com 尚未登入系統

**解決方案**：
1. 使用 acejou27@gmail.com 登入系統
2. 使用 assign-super-admin.ts 腳本分配 super_admin 角色
3. 重新訪問 /admin 即可正常使用

**預防措施**：
- 在項目初始化時就建立第一個 super_admin
- 提供清楚的文檔說明如何分配 super_admin 角色
- 在 admin/layout.tsx 中提供更好的錯誤提示

**已修復**：
✅ Middleware i18n 處理正確
✅ Admin layout 權限檢查邏輯正確
✅ RBAC SQL 查詢使用正確欄位名稱
✅ 建立完整的角色分配腳本
✅ 建立完整的問題排查文檔

---

**最後更新**: 2025-10-20
