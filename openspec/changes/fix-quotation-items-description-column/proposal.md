# 修復 quotation_items 表的 description 欄位錯誤

**change-id**: fix-quotation-items-description-column
**status**: proposed
**created**: 2025-11-14

## 摘要

修復 D1 資料庫中 `quotation_items` 表的 `description` 欄位位置錯誤，導致無法正確插入資料的問題。

## 問題描述

### 根本原因
使用 `ALTER TABLE ADD COLUMN` 新增的 `description` 欄位被加到了表定義的末尾，但 `INSERT` 語句期望它在特定的位置（第4個欄位），導致欄位順序不匹配。

### 錯誤訊息
```
D1_ERROR: table quotation_items has no column named description: SQLITE_ERROR
```

### 目前的表結構（錯誤）
```sql
CREATE TABLE quotation_items (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL,
  product_id TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  description TEXT,  -- ← 錯誤：在最後
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
)
```

### 預期的表結構（正確）
```sql
CREATE TABLE quotation_items (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL,
  product_id TEXT,
  description TEXT,  -- ← 正確：在第4個位置
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
)
```

## 解決方案

由於 SQLite 不支援重新排序欄位，需要重建表結構：

1. **備份現有資料**
2. **刪除現有表**
3. **使用正確的欄位順序重新創建表**
4. **還原資料（如果有）**

## 影響範圍

- **資料庫**：D1 本地開發資料庫
- **API**：`/api/quotations` POST 端點
- **功能**：報價單建立功能

## 驗證計劃

1. 執行遷移腳本修復表結構
2. 測試報價單建立功能
3. 確認可以成功儲存包含 description 的報價單項目
4. 驗證雙語描述正確儲存和讀取