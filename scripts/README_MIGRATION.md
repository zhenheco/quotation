# 🚨 Migration 修復說明

## 問題診斷

執行 migration SQL 時出現錯誤：
```
ERROR: 42703: column "user_id" does not exist
```

**原因**:
1. 資料庫中可能有部分表已存在但結構不完整
2. 之前的 migration 執行失敗留下殘留資料
3. 表的創建順序或依賴關係有問題

---

## ✅ 解決方案

我已經準備好**全新的 migration 腳本**，它會：
- 🧹 **先清理所有舊表**（避免衝突）
- ✅ **建立所有 19 個表**（5 個基礎表 + 14 個擴充表）
- ✅ 建立索引、外鍵、觸發器
- ✅ 啟用 RLS 政策
- ✅ 插入預設資料（roles, permissions, role_permissions）

**關鍵改進**: 使用 `DROP TABLE IF EXISTS` 先清理，確保從乾淨狀態開始，避免殘留資料造成的錯誤。

---

## 📋 執行步驟

### 選項 A: 直接執行新腳本（推薦）⭐

**文件**: `scripts/FRESH_START_MIGRATION.sql` ← **推薦使用這個**

這個腳本會：
1. ✅ 自動清理所有舊表
2. ✅ 從零開始建立所有表
3. ✅ 一次搞定所有問題

### 選項 B: 手動診斷 + 清理（進階）

如果想了解當前狀態：

**步驟 1**: 診斷
- **文件**: `scripts/DIAGNOSE_CURRENT_STATE.sql`
- **用途**: 查看目前有哪些表

**步驟 2**: 清理（如果有舊表）
- **文件**: `scripts/CLEANUP_TABLES.sql`
- **用途**: 刪除所有舊表

**步驟 3**: 執行 Migration
- **文件**: `scripts/COMPLETE_MIGRATION.sql`

---

## 🚀 執行方式（選項 A - 推薦）

1. 打開 [Supabase Dashboard SQL Editor](https://supabase.com/dashboard/project/nxlqtnnssfzzpbyfjnby/editor)
2. 複製 `FRESH_START_MIGRATION.sql` 的內容
3. 貼上到 SQL Editor
4. 點擊 "Run" 執行
5. 等待 20-30 秒

**預期結果**:
```
✅ 完成！所有表已建立
📊 基礎表: 5
🔐 RBAC 表: 5
🏢 公司表: 3
💰 合約收款表: 3
📝 審計擴充表: 3
👥 角色資料: 5
🔑 權限資料: 21
🔗 角色權限對應: 80+
```

---

## 📁 文件說明

| 文件名 | 用途 | 執行時機 | 優先級 |
|--------|------|---------|--------|
| `FRESH_START_MIGRATION.sql` | ⭐ 全新開始的完整 migration（自動清理 + 建立） | 現在立即執行 | **最推薦** |
| `DIAGNOSE_CURRENT_STATE.sql` | 診斷當前資料庫狀態 | 可選，想了解現狀時 | 可選 |
| `CLEANUP_TABLES.sql` | 清理所有舊表 | 可選，手動清理時 | 可選 |
| `COMPLETE_MIGRATION.sql` | 完整 migration（不含清理） | 清理後執行 | 備用 |
| `check-default-data.sql` | 檢查預設資料狀態 | 執行完成後驗證用 | 驗證用 |

---

## ✨ 執行完成後

告訴我結果，我會：
1. ✅ 執行自動化驗證腳本
2. ✅ 確認所有表和資料正確
3. ✅ 更新文檔記錄
4. ✅ 準備下一步測試

---

**不急，有空再執行！** 👍
