# 📋 報價單系統測試 - 下一步執行指南

**日期**: 2025-10-24
**當前狀態**: RLS 策略修復準備完成，待執行

---

## 🎯 目標

完成報價單系統測試，達到 **100% 通過率**（9/9 測試）

---

## 📊 當前進度

### 已完成 ✅

1. **報價單系統測試腳本** - `scripts/test-quotation-system.ts`
   - 涵蓋 9 個測試類別
   - 初次測試: 7/9 通過（77.8%）

2. **RLS 策略修復腳本** - `scripts/FIX_QUOTATION_RLS_POLICIES.sql`
   - 為 `quotation_versions` 表建立 4 個策略
   - 為 `quotation_shares` 表建立 4 個策略

3. **問題診斷**
   - ❌ quotation_versions: 缺少 INSERT/UPDATE/DELETE 策略
   - ❌ quotation_shares: 缺少 INSERT/UPDATE/DELETE 策略

### 待執行 ⏳

1. 在 Supabase Dashboard 執行 RLS 修復 SQL
2. 重新執行測試驗證修復
3. 建立測試成功報告

---

## 🔧 執行步驟

### 步驟 1: 執行 RLS 策略修復

**方法 A: 使用 Supabase Dashboard（推薦）**

1. 開啟 Supabase Dashboard
   ```
   https://supabase.com/dashboard
   ```

2. 選擇專案並進入 SQL Editor
   - 左側選單 → SQL Editor
   - 點擊「New query」

3. 複製並貼上修復腳本
   ```bash
   # 在本地終端執行以查看腳本內容
   cat scripts/FIX_QUOTATION_RLS_POLICIES.sql
   ```

4. 執行 SQL
   - 點擊「Run」或按 Ctrl/Cmd + Enter
   - 確認所有 DROP POLICY 和 CREATE POLICY 都成功執行

5. 驗證策略建立成功
   - 腳本最後有驗證查詢
   - 應該看到每個表有 4 個策略（SELECT, INSERT, UPDATE, DELETE）

**方法 B: 使用測試腳本（備用）**

如果您安裝了 Supabase CLI：

```bash
# 使用 TypeScript 執行腳本（需要先建立 exec_sql 函數）
npx tsx scripts/apply-quotation-rls-fix.ts
```

### 步驟 2: 重新執行測試

執行完 RLS 修復後，重新運行測試：

```bash
npx tsx scripts/test-quotation-system.ts
```

**預期結果**:
```
============================================================
✅ 測試完成！
============================================================

📊 測試結果總結:
總測試數: 9
通過: 9
失敗: 0
成功率: 100.0%

✅ 所有測試都通過了！報價單系統運作正常。
```

### 步驟 3: 驗證測試涵蓋範圍

確認以下所有測試都通過：

- [x] ✅ 建立報價單
- [x] ✅ 讀取報價單
- [x] ✅ 新增報價單項目
- [x] ✅ 查詢報價單項目
- [x] ✅ 更新報價單總額
- [x] ✅ 變更報價單狀態
- [ ] ⏳ 建立報價單版本（待修復）
- [ ] ⏳ 建立分享連結（待修復）
- [x] ✅ 新增匯率

---

## 📝 RLS 策略詳情

### quotation_versions 表策略

```sql
-- SELECT: 使用者可以查看自己報價單的版本
CREATE POLICY "Users can view their quotation versions"
  ON quotation_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM quotations
    WHERE quotations.id = quotation_versions.quotation_id
    AND quotations.user_id = auth.uid()
  ));

-- INSERT: 使用者可以為自己的報價單建立版本
CREATE POLICY "Users can insert their quotation versions"
  ON quotation_versions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM quotations
    WHERE quotations.id = quotation_versions.quotation_id
    AND quotations.user_id = auth.uid()
  ));

-- UPDATE: 使用者可以更新自己報價單的版本
CREATE POLICY "Users can update their quotation versions"
  ON quotation_versions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM quotations
    WHERE quotations.id = quotation_versions.quotation_id
    AND quotations.user_id = auth.uid()
  ));

-- DELETE: 使用者可以刪除自己報價單的版本
CREATE POLICY "Users can delete their quotation versions"
  ON quotation_versions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM quotations
    WHERE quotations.id = quotation_versions.quotation_id
    AND quotations.user_id = auth.uid()
  ));
```

### quotation_shares 表策略

```sql
-- 與 quotation_versions 相同的模式
-- 4 個策略: SELECT, INSERT, UPDATE, DELETE
-- 都透過 quotations.user_id = auth.uid() 驗證權限
```

---

## 🔍 疑難排解

### 問題 1: SQL 執行失敗

**錯誤**: `permission denied for table quotation_versions`

**解決方案**:
- 確認您使用的是有足夠權限的帳號
- 在 Supabase Dashboard 使用 Service Role 權限執行

### 問題 2: 策略建立後測試仍失敗

**檢查清單**:
1. 確認所有 8 個策略都已建立（每個表 4 個）
2. 執行驗證查詢檢查策略:
   ```sql
   SELECT tablename, policyname, cmd
   FROM pg_policies
   WHERE tablename IN ('quotation_versions', 'quotation_shares')
   ORDER BY tablename, policyname;
   ```
3. 清除測試資料重新執行:
   ```bash
   # 測試腳本會自動清理，直接重新執行即可
   npx tsx scripts/test-quotation-system.ts
   ```

### 問題 3: OAuth redirect_uri_mismatch 錯誤

**說明**: 此錯誤與報價單測試無關，是前端 OAuth 配置問題

**解決方案**:
1. 前往 Supabase Dashboard → Authentication → URL Configuration
2. 檢查並更新 Redirect URLs
3. 本地開發通常使用: `http://localhost:3000/**`

---

## 📈 測試資料說明

### 測試過程建立的資料

測試腳本會自動建立以下測試資料：

**客戶**:
- 名稱: 測試科技公司 {timestamp}
- Email: test-{timestamp}@example.com

**產品**:
- 名稱: HP 商用筆電 {timestamp}
- 單價: 30,000 TWD

**報價單**:
- 編號: QT-{timestamp}
- 狀態: draft → sent
- 項目: 5 × 30,000 × 95% = 142,500 TWD
- 稅額: 142,500 × 5% = 7,125 TWD
- 總計: 149,625 TWD

**自動清理**:
- 測試結束後自動刪除所有測試資料
- 依照正確順序（反向 FK）刪除避免錯誤

---

## ✅ 完成檢查清單

完成以下所有項目後，報價單系統測試即完成：

- [ ] 在 Supabase Dashboard 執行 `FIX_QUOTATION_RLS_POLICIES.sql`
- [ ] 驗證 8 個 RLS 策略都已建立
- [ ] 執行 `npx tsx scripts/test-quotation-system.ts`
- [ ] 確認測試結果為 9/9 通過（100%）
- [ ] 建立測試成功報告（可選）
- [ ] 更新 CHANGELOG.md 標記為完成
- [ ] Git commit 記錄完成狀態

---

## 🎯 下一階段

報價單測試 100% 完成後，根據您的選擇「1和3先來」，下一步是：

### 優先級 2: 其他系統功能測試

**公司管理系統** (companies, company_members, company_settings):
- 測試多公司架構
- 公司成員管理
- 公司設定配置

**合約與付款系統** (customer_contracts, payments, payment_schedules):
- 客戶合約管理
- 付款記錄追蹤
- 付款排程自動化

**稽核系統** (audit_logs):
- 操作記錄追蹤
- 安全稽核日誌

---

## 📞 需要協助？

如果遇到任何問題：

1. 檢查 `docs/PROJECT_STATUS_2025-10-24.md` 了解整體進度
2. 參考 `CHANGELOG.md` 查看詳細變更記錄
3. 查看 `scripts/test-quotation-system.ts` 了解測試細節

---

**最後更新**: 2025-10-24
**狀態**: 等待 RLS 策略執行
