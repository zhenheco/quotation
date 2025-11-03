# 產品選擇功能測試指南

## 測試目的
驗證報價單編輯頁面從下拉選單選擇產品後，價格和相關資料是否正確帶入表單。

## 測試環境
- 開發伺服器：http://localhost:3000
- 狀態：✅ 正在執行

## 測試步驟

### 1. 登入系統
1. 開啟瀏覽器前往 http://localhost:3000
2. 使用測試帳號登入

### 2. 前往報價單編輯頁面
1. 點擊側邊欄的「報價單」選單
2. 選擇任意一筆報價單，點擊「編輯」按鈕
3. 或直接訪問：http://localhost:3000/zh/quotations/{報價單ID}/edit

### 3. 測試產品選擇功能

#### 3.1 檢查產品下拉選單
- [ ] 產品下拉選單是否顯示
- [ ] 是否能看到產品清單
- [ ] 產品清單是否包含產品名稱和 SKU

#### 3.2 選擇產品並檢查欄位自動填入
選擇任意產品後，檢查以下欄位是否自動填入：
- [ ] **單價 (Unit Price)** - 應顯示產品的價格，例如：1000
- [ ] **幣別 (Currency)** - 應顯示產品的幣別，例如：TWD
- [ ] **產品名稱 (Name)** - 應自動填入產品名稱
- [ ] **產品 SKU** - 應自動填入產品 SKU
- [ ] **產品描述 (Description)** - 應自動填入產品描述

#### 3.3 驗證數值正確性
- [ ] 單價是否為**數字**（不是 0 或空白）
- [ ] 幣別是否為**正確的貨幣代碼**（TWD/USD/EUR 等）
- [ ] 總計是否根據單價 × 數量正確計算

### 4. 使用 Chrome DevTools 檢查錯誤

#### 4.1 開啟 DevTools
按下 `F12` 或 `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows) 開啟 Chrome DevTools

#### 4.2 檢查 Console 錯誤
1. 切換到 **Console** 標籤
2. 執行產品選擇操作
3. 檢查是否有紅色錯誤訊息：
   - [ ] 無任何 JavaScript 錯誤
   - [ ] 無 API 請求失敗 (4xx, 5xx)
   - [ ] 無 console.error 訊息

#### 4.3 檢查 Network 請求
1. 切換到 **Network** 標籤
2. 重新整理頁面
3. 檢查以下請求：
   - [ ] `GET /zh/quotations/{id}/edit` - 應返回 200
   - [ ] 是否有其他 500 Internal Server Error

#### 4.4 檢查產品資料結構
在 Console 中執行以下命令檢查產品資料：
```javascript
// 檢查產品資料是否包含正確的欄位
console.log(products[0]);
// 預期輸出應包含：
// {
//   id: "...",
//   name: "產品名稱",
//   sku: "SKU-001",
//   unit_price: 1000,      // ✅ 必須存在
//   currency: "TWD",       // ✅ 必須存在
//   base_price: 1000,      // 向後相容
//   base_currency: "TWD",  // 向後相容
//   ...
// }
```

## 修復內容

### 資料庫服務層修改
已修改以下函數以正確映射欄位：

1. **`getProducts()`** (`lib/services/database.ts:192-202`)
   - 加入欄位映射：`unit_price` ← `base_price`, `currency` ← `base_currency`

2. **`getProductById()`** (`lib/services/database.ts:204-216`)
   - 返回映射後的欄位

3. **`createProduct()`** (`lib/services/database.ts:218-247`)
   - 接受 `unit_price` 和 `currency`
   - 插入到資料庫為 `base_price` 和 `base_currency`
   - 返回映射後的欄位

4. **`updateProduct()`** (`lib/services/database.ts:258-293`)
   - 返回映射後的欄位

### 欄位映射邏輯
```typescript
// 修復前（錯誤）
const products = await query('SELECT * FROM products');
return products.rows; // 只有 base_price, base_currency

// 修復後（正確）
const products = await query('SELECT * FROM products');
return products.rows.map(row => ({
  ...row,
  unit_price: row.base_price,    // ✅ 映射欄位
  currency: row.base_currency     // ✅ 映射欄位
}));
```

## 預期結果

### ✅ 成功情況
- 選擇產品後，所有欄位正確填入
- 單價和幣別顯示實際數值（不是 0 或空白）
- Console 無任何錯誤訊息
- 總計計算正確

### ❌ 失敗情況（修復前）
- 單價顯示為 `0`
- 幣別顯示為空白
- 產品選擇後沒有反應
- Console 出現 `undefined` 錯誤

## 問題排查

如果測試失敗，請檢查：

1. **資料庫連線**
   - 確認 `.env.local` 中的 `SUPABASE_DB_URL` 正確

2. **產品資料是否存在**
   - 確認資料庫中有產品資料
   - 確認產品的 `base_price` 和 `base_currency` 欄位有值

3. **伺服器日誌**
   - 檢查開發伺服器終端機的錯誤訊息

4. **瀏覽器快取**
   - 嘗試清除瀏覽器快取或使用無痕模式

## 相關文件

- `DATABASE_SERVICE_FIX.md` - 資料庫服務層修復詳細說明
- `PRODUCT_FIELD_MAPPING_FIX.md` - API 層修復記錄
- `openspec/changes/fix-product-field-mapping/` - OpenSpec 變更提案
- `lib/services/database.ts` - 資料庫服務層實作

---

**測試時間**：2025-11-03
**測試者**：請在測試後填寫測試結果
**測試結果**：[ ] 通過 / [ ] 失敗
**備註**：
