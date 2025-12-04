# Development Log

## 2024-12-04: 客戶和商品編號系統

### 問題
- 建立客戶/商品時報錯「編號已存在」
- `customer_number` 和 `product_number` 欄位在程式碼中被引用但資料庫不存在

### 解決方案
仿照報價單編號系統（migration 025）的模式實作：

1. **資料庫遷移** (`migrations/033_customer_product_number_system.sql`)
   - 新增 `customer_number` 和 `product_number` 欄位
   - 複合唯一約束 `(company_id, number)` - 每家公司獨立編號
   - 序列表追蹤每月編號
   - Advisory Lock 防止競爭條件
   - RPC 函數：`generate_customer_number_atomic()`, `generate_product_number_atomic()`

2. **DAL 層修改**
   - `lib/dal/customers.ts`: 新增 `generateCustomerNumber()`, `createCustomerWithRetry()`
   - `lib/dal/products.ts`: 新增 `generateProductNumber()`, `createProductWithRetry()`

3. **API 端點**
   - 新增 `/api/customers/generate-number`
   - 新增 `/api/products/generate-number`
   - 修改 POST `/api/customers` 和 `/api/products` 支援自訂編號

4. **前端表單**
   - `CustomerForm.tsx`: 新增客戶編號欄位，載入時自動生成
   - `ProductForm.tsx`: 新增商品編號欄位，載入時自動生成

5. **i18n 翻譯**
   - 新增 `customer.customerNumber` 和 `product.productNumber`

### 編號格式
- 客戶：`CUS202512-0001`
- 商品：`PRD202512-0001`

### 測試要點
- 新建客戶/商品時自動生成編號
- 使用者可自訂編號
- 不同公司可有相同編號
- 同公司不能有重複編號
