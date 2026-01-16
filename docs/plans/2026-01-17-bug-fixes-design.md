# Bug Fixes Design - 2026-01-17

## Overview

修復報價系統的 10 個問題，涵蓋分類顯示、權限、備註、客戶欄位、金額限制等。

---

## 問題清單

| # | 問題 | 根本原因 | 複雜度 |
|---|------|----------|--------|
| 1 | 分類選擇中文但列表顯示英文 | 列表沒有根據語系轉換分類標籤 | 低 |
| 2 | 訂單/出貨管理無側邊欄 | 需檢查 layout 是否正確套用 | 低 |
| 3 | 訂單/出貨管理 403 Forbidden | `permissions` 表缺少權限記錄 | 低 |
| 5 | 報價單備註無法儲存 | JSON 序列化和儲存邏輯問題 | 中 |
| 6 | 報價單備註顯示 `\n` 或 `zh` | `parseNotes()` 沒有正確應用 | 中 |
| 7 | 客戶新增聯絡窗口和引薦人 | 需新增資料庫欄位和表單 UI | 中 |
| 8 | 金額上限只有 99999 | 需明確設定 max 屬性 | 低 |
| 9 | 新增產品時分類無法儲存 | POST API 遺漏 `category` 欄位 | 低 |
| 10 | 清空描述後仍顯示舊值 | 前端傳 `undefined` 而非空物件 | 低 |
| 11 | 金額 80000 顯示 80001 | 浮點數精度問題 | 中 |

---

## 修復方案

### 1. 分類多語系顯示

**新增檔案**: `lib/utils/category-labels.ts`

```typescript
export const CATEGORY_LABELS: Record<string, { zh: string; en: string }> = {
  service: { zh: '服務', en: 'Service' },
  product: { zh: '產品', en: 'Product' },
  software: { zh: '軟體', en: 'Software' },
  hardware: { zh: '硬體', en: 'Hardware' },
  consulting: { zh: '諮詢', en: 'Consulting' },
  maintenance: { zh: '維護', en: 'Maintenance' },
  design: { zh: '設計', en: 'Design' },
  training: { zh: '培訓', en: 'Training' },
}

export function getCategoryLabel(
  category: string | null,
  locale: 'zh' | 'en' = 'zh'
): string {
  if (!category) return ''
  return CATEGORY_LABELS[category]?.[locale] || category
}
```

**修改檔案**: `app/products/ProductList.tsx` - 使用 `getCategoryLabel()`

---

### 2. 訂單/出貨側邊欄

**檢查項目**:
- 確認 `app/orders/layout.tsx` 包含 `<Sidebar />`
- 確認路由結構正確
- 比對其他正常頁面的 layout

---

### 3. 訂單/出貨權限

**SQL Migration**:

```sql
-- 新增 orders 和 shipments 權限
INSERT INTO permissions (name, description, resource, action) VALUES
  ('orders:read', '查看訂單', 'orders', 'read'),
  ('orders:write', '建立/編輯訂單', 'orders', 'write'),
  ('orders:delete', '刪除訂單', 'orders', 'delete'),
  ('shipments:read', '查看出貨單', 'shipments', 'read'),
  ('shipments:write', '建立/編輯出貨單', 'shipments', 'write'),
  ('shipments:delete', '刪除出貨單', 'shipments', 'delete');

-- 分配給 company_owner 角色
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'company_owner'
  AND p.name IN ('orders:read', 'orders:write', 'orders:delete',
                 'shipments:read', 'shipments:write', 'shipments:delete');
```

---

### 5-6. 備註系統修復

**修改檔案**: `lib/utils/notes-parser.ts`

```typescript
export function parseNotes(notes: unknown): string {
  if (!notes) return ''

  if (typeof notes === 'string') {
    try {
      const parsed = JSON.parse(notes)
      return normalizeNewlines(parsed.zh || parsed.en || '')
    } catch {
      return normalizeNewlines(notes)
    }
  }

  if (typeof notes === 'object') {
    const obj = notes as { zh?: string; en?: string }
    return normalizeNewlines(obj.zh || obj.en || '')
  }

  return ''
}

function normalizeNewlines(str: string): string {
  return str.replace(/\\n/g, '\n')
}
```

**修改檔案**: `app/quotations/QuotationForm.tsx` - 儲存時確保格式正確

---

### 7. 客戶欄位擴充

**SQL Migration**:

```sql
ALTER TABLE customers
ADD COLUMN secondary_contact JSONB DEFAULT NULL,
ADD COLUMN referrer JSONB DEFAULT NULL;

COMMENT ON COLUMN customers.secondary_contact IS '次要聯絡人: { name, phone, email, title, notes }';
COMMENT ON COLUMN customers.referrer IS '引薦人: { name, phone, email, title, notes }';
```

**修改檔案**:
- `app/customers/CustomerForm.tsx` - 新增表單欄位
- `lib/dal/customers.ts` - 更新型別定義
- `app/api/customers/route.ts` - 處理新欄位

---

### 8. 金額上限

**修改檔案**:
- `app/products/ProductForm.tsx`
- `app/quotations/QuotationForm.tsx`

```tsx
<input
  type="number"
  min="0"
  max="999999999"
  step="1"
  ...
/>
```

---

### 9. POST API 補上 category

**修改檔案**: `app/api/products/route.ts`

```typescript
const productData = {
  // ... 現有欄位
  category: body.category,        // 新增
  supplier_code: body.supplier_code,  // 新增
}
```

---

### 10. 清空描述修復

**修改檔案**: `app/products/ProductForm.tsx`

```typescript
// 修改前
description: formData.descriptionZh || formData.descriptionEn
  ? { zh: formData.descriptionZh, en: formData.descriptionEn }
  : undefined,

// 修改後
description: {
  zh: formData.descriptionZh || '',
  en: formData.descriptionEn || ''
},
```

---

### 11. 金額精度

**修改檔案**: API routes

```typescript
const price = Math.round(parseFloat(body.base_price) || 0)
```

---

## 實作順序

1. 問題 3：權限 SQL（解除 403 阻塞）
2. 問題 9：POST API 補 category
3. 問題 10：清空描述修復
4. 問題 1：分類多語系
5. 問題 5-6：備註系統
6. 問題 8、11：金額問題
7. 問題 7：客戶欄位（需 migration）
8. 問題 2：側邊欄檢查

---

## 測試計劃

| 問題 | 測試方式 |
|------|----------|
| 1 | 新增產品選擇分類，在列表確認顯示中文 |
| 2 | 進入訂單/出貨頁面，確認側邊欄出現 |
| 3 | 以一般用戶登入，確認可以存取訂單/出貨 |
| 5-6 | 新增/編輯報價單備註，確認儲存和顯示正常 |
| 7 | 新增客戶，填寫次要聯絡人和引薦人 |
| 8 | 輸入金額 1000000，確認可以儲存 |
| 9 | 新增產品選擇分類，確認儲存成功 |
| 10 | 編輯產品清空描述，確認儲存後為空 |
| 11 | 輸入金額 80000，確認儲存後仍為 80000 |
