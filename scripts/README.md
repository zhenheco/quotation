# 📁 測試腳本目錄 | Scripts Directory

本目錄包含 Supabase 資料庫和功能測試的所有腳本。

---

## 🚀 快速開始

### 1. 測試連接（必要）

確認 Supabase 連接和資料庫設定：

```bash
npx tsx scripts/test-supabase-connection.ts
```

**預期結果**：成功率 80%（4/5 通過）

---

### 2. 建立測試帳號

選擇以下**任一方式**建立測試帳號：

#### 方式 A: 使用 Mailinator（推薦）

```bash
npx tsx scripts/test-auth-with-mailinator.ts
```

記下產生的 Email 和密碼，用於後續測試。

#### 方式 B: 手動建立

1. 前往 **Supabase Dashboard > Authentication > Users**
2. 點擊 **"Add user"**
3. 輸入 Email 和密碼
4. ✅ 勾選 **"Auto Confirm User"**

---

### 3. 測試 CRUD 功能

使用建立的測試帳號執行 CRUD 測試：

```bash
npx tsx scripts/test-crud-operations.ts <email> <password>
```

**範例**：

```bash
# 使用 Mailinator 帳號
npx tsx scripts/test-crud-operations.ts quotation-test-123@mailinator.com TestPassword123!

# 或手動建立的帳號
npx tsx scripts/test-crud-operations.ts test@example.com TestPassword123!
```

**預期結果**：成功率 100%（9/9 通過）

---

## 📋 測試腳本說明

### 連接測試

| 腳本 | 說明 | 執行方式 |
|------|------|----------|
| `test-supabase-connection.ts` | 測試 Supabase 連接和 19 個表的存在性 | `npx tsx scripts/test-supabase-connection.ts` |

### 認證測試

| 腳本 | 說明 | 執行方式 |
|------|------|----------|
| `test-auth-flow.ts` | 完整認證流程測試（需要有效 Email） | `npx tsx scripts/test-auth-flow.ts` |
| `test-auth-with-mailinator.ts` | 使用 Mailinator 的認證測試（推薦） | `npx tsx scripts/test-auth-with-mailinator.ts` |

### CRUD 測試

| 腳本 | 說明 | 執行方式 |
|------|------|----------|
| `test-crud-operations.ts` | 客戶和產品的完整 CRUD 測試 | `npx tsx scripts/test-crud-operations.ts <email> <password>` |

### Migration 相關

| 腳本 | 說明 | 執行位置 |
|------|------|----------|
| `FRESH_START_MIGRATION.sql` | 完整資料庫建立腳本 | Supabase Dashboard > SQL Editor |
| `FINAL_VERIFICATION.sql` | 驗證 migration 結果 | Supabase Dashboard > SQL Editor |
| `QUICK_CHECK.sql` | 快速檢查表數量 | Supabase Dashboard > SQL Editor |

---

## 🔧 故障排除

### 問題：Email 格式無效

```
❌ Email address "xxx@example.com" is invalid
```

**解決方案**：
- 使用 `test-auth-with-mailinator.ts`
- 或在 Dashboard 手動建立使用者
- 或關閉 Email 確認要求

詳見：[`docs/AUTH_SETUP_GUIDE.md`](../docs/AUTH_SETUP_GUIDE.md)

### 問題：RLS 權限錯誤

```
❌ permission denied for table xxx
```

**說明**：這是正常的安全行為，表示 RLS 正常運作。

**解決方案**：確保已登入後再執行 CRUD 操作。

### 問題：連接失敗

**檢查項目**：
1. `.env.local` 設定正確
2. Supabase 專案正常運作
3. 網路連線正常

---

## 📚 詳細文檔

完整的測試流程和說明，請參考：

- **[測試指南](../docs/TESTING_GUIDE.md)** - 完整測試流程
- **[認證設定指南](../docs/AUTH_SETUP_GUIDE.md)** - 認證系統設定

---

## ✅ 測試檢查清單

使用此清單確認測試進度：

- [ ] **連接測試** - 執行 `test-supabase-connection.ts`
  - [ ] 環境變數正確
  - [ ] 客戶端建立成功
  - [ ] 19 個表都存在

- [ ] **建立測試帳號**
  - [ ] 使用 Mailinator 或手動建立
  - [ ] 記錄 Email 和密碼

- [ ] **CRUD 測試** - 執行 `test-crud-operations.ts`
  - [ ] 登入成功
  - [ ] 客戶 CRUD 全部通過
  - [ ] 產品 CRUD 全部通過
  - [ ] 資料自動清理

- [ ] **下一步**
  - [ ] RBAC 權限測試
  - [ ] 報價單流程測試
  - [ ] 前端整合

---

## 🎯 測試目標

當所有測試通過時，表示：

✅ Supabase 資料庫正常運作
✅ 認證系統設定正確
✅ CRUD 操作功能完整
✅ RLS 安全策略生效
✅ 可以開始前端整合

---

**祝測試順利！** 🚀

有問題請參考詳細文檔或查看 `ISSUELOG.md`。
