# 實作任務清單

## 1. 資料庫服務層欄位映射

- [x] 1.1 修改 `lib/services/database.ts` 中的 `getProducts()` 函數，加入欄位映射
- [x] 1.2 修改 `lib/services/database.ts` 中的 `getProductById()` 函數，加入欄位映射
- [x] 1.3 修改 `lib/services/database.ts` 中的 `createProduct()` 函數，返回映射後的欄位
- [x] 1.4 修改 `lib/services/database.ts` 中的 `updateProduct()` 函數，返回映射後的欄位

## 2. API 層欄位映射（已於先前完成）

- [x] 2.1 修改 `app/api/products/route.ts` GET 端點，加入欄位映射
- [x] 2.2 修改 `app/api/products/[id]/route.ts` GET 端點，加入欄位映射
- [x] 2.3 修改 `app/api/products/[id]/route.ts` PUT 端點，加入欄位映射

## 3. 驗證

- [x] 3.1 執行 `npm run build` 確保編譯成功
- [x] 3.2 驗證所有產品相關函數都返回正確的欄位

## 4. 文件更新

- [x] 4.1 建立 `PRODUCT_FIELD_MAPPING_FIX.md` 記錄修復過程
- [x] 4.2 更新 OpenSpec 提案反映實際修復範圍
