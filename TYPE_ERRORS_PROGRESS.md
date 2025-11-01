# TypeScript 類型錯誤修復進度

## 已修復 (18/100+)

### 1. Product 屬性錯誤 (15 個錯誤)
- ✅ `app/[locale]/products/ProductForm.tsx` - 修復 `unit_price` → `base_price`, `currency` → `base_currency`
- ✅ `app/[locale]/products/ProductList.tsx` - 修復所有 product 屬性引用
- ✅ `app/[locale]/quotations/QuotationForm.tsx` - 修復 product 屬性
- ✅ `hooks/useProducts.ts` - 修復價格過濾邏輯

### 2. NextRequest 導入錯誤 (1 個錯誤)
- ✅ `app/api/company/[id]/members/[userId]/route.ts` - 添加 NextRequest 導入

## 待修復 (82+ 錯誤)

### 高優先級 - 前端運行時錯誤
- ⏳ 畫面滑動空白問題（用戶報告）
- ⏳ 刪除鍵白畫面問題（用戶報告）

### 中優先級 - API 路由錯誤
- ⏳ `app/api/contracts/[id]/next-collection/route.ts` - NextRequest 導入
- ⏳ `app/api/contracts/[id]/payment-progress/route.ts` - NextRequest 導入
- ⏳ `app/api/payments/[id]/mark-overdue/route.ts` - NextRequest 導入
- ⏳ `app/api/companies/[id]/members/[userId]/route.ts` - params 類型錯誤
- ⏳ `app/api/companies/[id]/members/route.ts` - params 類型錯誤
- ⏳ `app/api/companies/[id]/route.ts` - params 類型錯誤
- ⏳ `app/api/exchange-rates/route.ts` - request 變數名稱錯誤
- ⏳ `app/api/seed-test-data/route.ts` - request 變數名稱錯誤
- ⏳ `app/api/test-email/route.ts` - request 變數名稱錯誤

### 中優先級 - Customer 類型錯誤
- ⏳ `hooks/useCustomers.ts` - 缺少 `contact_person`, `tax_id` 屬性

### 中優先級 - Charts 類型錯誤
- ⏳ `components/charts/CurrencyChart.tsx` - unknown 類型問題
- ⏳ `components/charts/RevenueChart.tsx` - unknown 類型問題
- ⏳ `components/charts/StatusChart.tsx` - unknown 類型問題

### 中優先級 - RoleName 類型錯誤
- ⏳ `types/extended.types.ts` - 缺少 RoleName 導出
- ⏳ `app/test-permissions/page.tsx` - RoleName 導入錯誤
- ⏳ `components/permission/MemberList.tsx` - RoleName 導入錯誤
- ⏳ `components/permission/RoleSelector.tsx` - RoleName 導入錯誤
- ⏳ `hooks/permission/useCompanies.ts` - RoleName 導入錯誤
- ⏳ `hooks/permission/useCompanyMembers.ts` - RoleName 導入錯誤
- ⏳ `hooks/permission/usePermissions.ts` - RoleName 導入錯誤

### 低優先級 - 其他類型錯誤
- ⏳ `lib/services/company.ts` - adminRole 未定義
- ⏳ `lib/pdf/generator.ts` - PDF 類型錯誤
- ⏳ `.next/types/app/[locale]/dashboard/page.ts` - PageProps 類型錯誤

## 注意事項

- ESLint 遇到記憶體不足問題，需要增加 heap 大小
- 總共約 100+ 個類型錯誤需要修復
- 優先處理影響用戶體驗的運行時錯誤
