# 修復報價單編輯產品選擇資料帶入問題

## Why

報價單編輯頁面選擇產品後，產品的單價（unit_price）、幣別（currency）等資料無法正確帶入表單，導致所有欄位顯示為 0 或空值。這是因為資料庫使用 `base_price` 和 `base_currency` 欄位，但前端期望 `unit_price` 和 `currency` 欄位，造成欄位名稱不匹配。

## What Changes

- 在產品 API 層加入欄位映射邏輯，將資料庫欄位 `base_price` 和 `base_currency` 映射為前端期望的 `unit_price` 和 `currency`
- 確保所有產品 API 端點（GET /api/products, GET /api/products/[id], PUT /api/products/[id]）都返回映射後的欄位
- 保持向後相容性，同時返回原始欄位名稱和映射後的欄位名稱

## Impact

- 影響規格：quotation-edit, product-api, database-service
- 影響代碼：
  - `lib/services/database.ts` - 產品資料庫服務層函數
    - `getProducts()` - 取得所有產品
    - `getProductById()` - 取得單一產品
    - `createProduct()` - 建立產品
    - `updateProduct()` - 更新產品
  - `app/api/products/route.ts` - GET 端點（已修復）
  - `app/api/products/[id]/route.ts` - GET 和 PUT 端點（已修復）
- 修復後，報價單編輯頁面選擇產品時，單價和幣別將正確顯示
