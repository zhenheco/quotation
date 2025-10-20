# 超級管理員測試資料設定指南

## 🎯 目標

建立完整的測試資料，讓你可以測試超級管理員控制台的所有功能。

---

## 📋 測試資料內容

### 5 間測試公司
1. **台灣科技股份有限公司** (台北)
   - 統編: 12345678
   - 擁有者: owner1@example.com (陳大明)
   - 成員: 經理、業務、會計

2. **優質貿易有限公司** (新竹)
   - 統編: 23456789
   - 擁有者: owner2@example.com (林小華)
   - 成員: 2 位業務

3. **創新設計工作室** (台中)
   - 統編: 34567890
   - 擁有者: owner3@example.com (王美玲)
   - 成員: 1 位經理

4. **全球物流企業** (高雄)
   - 統編: 45678901
   - 擁有者: owner4@example.com (張志強)

5. **數位行銷顧問公司** (台北)
   - 統編: 56789012
   - 擁有者: owner5@example.com (李雅婷)

### 10 位測試使用者

#### 公司擁有者 (5 位)
- owner1@example.com - 陳大明
- owner2@example.com - 林小華
- owner3@example.com - 王美玲
- owner4@example.com - 張志強
- owner5@example.com - 李雅婷

#### 公司成員 (5 位)
- manager1@example.com - 劉經理 (Sales Manager)
- sales1@example.com - 黃業務 (Salesperson)
- sales2@example.com - 吳業務 (Salesperson)
- accountant1@example.com - 鄭會計 (Accountant)
- employee1@example.com - 周員工 (Salesperson)

---

## 🚀 設定步驟

### 步驟 1: 確認開發伺服器正在運行

```bash
npm run dev
```

應該會在 `http://localhost:3001` 看到應用程式。

### 步驟 2: 修復路由問題

如果訪問 `/admin` 會跳轉到 `/zh/admin` 並出現 404，那是因為 middleware 設定問題。

✅ **已修復！** middleware.ts 已更新，現在 `/admin` 路由會正確工作。

重新啟動開發伺服器後，直接訪問：
```
http://localhost:3001/admin
```

### 步驟 3: 讓測試使用者登入系統（重要！）

⚠️ **在執行測試資料腳本之前，每位測試使用者必須先登入一次。**

這是因為：
- 使用者資料儲存在 Supabase Auth
- 第一次登入時，系統會自動建立 `user_profiles` 記錄
- 腳本需要這些記錄才能建立公司與角色關係

#### 如何讓測試使用者登入？

**方法 1: 使用 Google OAuth（推薦）**

如果你有這些測試用的 Google 帳號，直接用它們登入：

1. 訪問 `http://localhost:3001/login`
2. 點擊「使用 Google 登入」
3. 選擇對應的 Google 帳號
4. 登入成功後登出
5. 重複以上步驟，直到所有測試帳號都登入過一次

**方法 2: 使用現有的 Google 帳號測試（簡化版）**

如果你沒有這些測試用 Google 帳號，可以：

1. 使用你自己的 Google 帳號登入
2. 腳本會跳過尚未登入的使用者
3. 只會為已登入的使用者建立公司與角色關係

### 步驟 4: 執行測試資料腳本

當至少有一些測試使用者登入後，執行：

```bash
npm run seed:admin
```

#### 腳本會做什麼？

1. ✅ 建立 5 間測試公司
2. ✅ 檢查哪些測試使用者已經登入
3. ✅ 為已登入的使用者：
   - 設定為公司擁有者
   - 分配角色（company_owner）
   - 建立公司成員關係
4. ✅ 新增其他成員到公司
5. ✅ 更新使用者名稱

#### 預期輸出

```
🌱 開始建立超級管理員測試資料...

📊 步驟 1: 建立測試公司...
  ✅ 已建立/更新公司: 台灣科技股份有限公司
  ✅ 已建立/更新公司: 優質貿易有限公司
  ...

✨ 成功建立 5 間公司

👥 步驟 2: 檢查測試使用者...

⚠️  重要提示：
   以下測試使用者需要先透過 Google OAuth 登入系統一次，
   系統會自動建立 user_profiles 記錄。

   測試使用者帳號：
   - owner1@example.com (陳大明)
   - owner2@example.com (林小華)
   ...

📋 已在系統中的使用者: 3/10
  ✅ owner1@example.com
  ✅ owner2@example.com
  ✅ manager1@example.com

⏸️  尚未登入的使用者:
  ⚠️  owner3@example.com - 請先登入一次
  ...

🏢 步驟 3: 設定公司擁有者...
  ✅ 台灣科技股份有限公司 - 擁有者: owner1@example.com
  ...

📊 測試資料建立完成！

統計資訊：
  - 公司總數: 5
  - 已設定的使用者: 3
  - 成員關係: 5

✨ 可以開始測試超級管理員控制台了！
   訪問: http://localhost:3001/admin
```

### 步驟 5: 開始測試

使用超級管理員帳號登入：
- **Email**: acejou27@gmail.com
- **身份**: Super Admin

訪問控制台：
```
http://localhost:3001/admin
```

你應該能看到：
- ✅ 儀表板統計資料
- ✅ 5 間公司列表
- ✅ 已登入的使用者列表
- ✅ 公司詳情與成員
- ✅ 使用者詳情與角色

---

## 🧪 測試功能

### 儀表板頁面
- [ ] 查看公司總數統計
- [ ] 查看使用者總數統計
- [ ] 查看角色分布
- [ ] 點擊快速操作連結

### 公司管理頁面
- [ ] 查看所有公司列表
- [ ] 搜尋公司（名稱、統編、Email）
- [ ] 篩選狀態（活躍/非活躍）
- [ ] 點擊「查看詳情」進入公司詳情頁
- [ ] 查看公司基本資訊
- [ ] 查看擁有者資訊
- [ ] 查看成員列表

### 使用者管理頁面
- [ ] 查看所有使用者列表
- [ ] 搜尋使用者（名稱、Email、公司）
- [ ] 篩選角色
- [ ] 點擊「查看詳情」進入使用者詳情頁
- [ ] 查看使用者基本資訊
- [ ] 查看系統角色
- [ ] 查看公司成員關係
- [ ] 點擊公司連結跳轉到公司詳情

---

## ❓ 常見問題

### Q1: 訪問 /admin 出現 404

**A**: 確認 middleware.ts 已更新，重新啟動開發伺服器。

```bash
# 停止當前伺服器 (Ctrl+C)
# 重新啟動
npm run dev
```

### Q2: 腳本顯示「尚未登入的使用者」

**A**: 這是正常的。你可以：
- 選項 1: 讓那些使用者先登入一次
- 選項 2: 繼續使用已登入的使用者進行測試
- 選項 3: 使用自己的 Google 帳號登入並測試

### Q3: 無法以超級管理員身份訪問控制台

**A**: 確認 acejou27@gmail.com 有 super_admin 角色：

```sql
-- 在資料庫執行
SELECT u.email, r.role_name
FROM user_profiles u
JOIN user_roles ur ON u.user_id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'acejou27@gmail.com';
```

應該看到 `super_admin` 角色。

### Q4: 想要重新建立測試資料

**A**: 重新執行腳本即可，它會更新現有資料：

```bash
npm run seed:admin
```

### Q5: 想要清除測試資料

**A**: 在資料庫執行：

```sql
-- 刪除測試公司
DELETE FROM companies WHERE tax_id IN (
  '12345678', '23456789', '34567890', '45678901', '56789012'
);

-- 這會自動級聯刪除相關的 company_members 記錄
```

---

## 📚 相關文檔

- **完整測試指南**: `docs/PHASE_4_TESTING_GUIDE.md`
- **Phase 4 摘要**: `docs/PHASE_4_SUMMARY.md`
- **變更記錄**: `CHANGELOG.md`

---

## ✨ 下一步

測試資料建立完成後：

1. 參考 `docs/PHASE_4_TESTING_GUIDE.md` 進行完整測試
2. 測試所有搜尋與篩選功能
3. 測試響應式設計（手機、平板、桌面）
4. 回報任何發現的問題

---

**祝測試順利！** 🚀
