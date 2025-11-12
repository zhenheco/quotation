# Tasks: 修正收款統計 API 回應格式

## 實作任務

### 1. 修正 API 回應格式
- [x] 修改 `app/api/payments/statistics/route.ts`
  - 移除 `{ statistics: data }` 包裹層
  - 直接回傳 `data`
- [x] 確認型別定義與實際回應一致

### 2. 驗證修正
- [x] 使用 `pnpm run dev` 啟動開發伺服器
- [x] 使用 Chrome DevTools 開啟收款管理頁面
- [x] 確認主控台無 `TypeError: Cannot read properties of undefined` 錯誤
- [x] 確認統計卡片顯示正確數據：
  - 本月已收款
  - 本月待收款
  - 本月逾期款
  - 收款率

### 3. 程式碼品質檢查
- [x] 執行 `pnpm run lint`
- [x] 執行 `pnpm run typecheck`
- [x] 確認無 TypeScript 錯誤

## 驗證清單

- [x] ✅ 頁面載入無錯誤
- [x] ✅ 統計卡片顯示正確
- [x] ✅ 型別檢查通過
- [x] ✅ Lint 檢查通過

## 預期結果

修正後，收款管理頁面應該：
1. 無前端錯誤
2. 統計卡片正確顯示本月收款數據
3. 所有數值格式化正確（千分位分隔符）
4. 收款率計算正確

## 注意事項

- **不影響**：資料庫函式 `get_payment_statistics()` 保持不變
- **不影響**：型別定義 `PaymentStatistics` 和 `CollectionStatistics` 保持不變
- **影響範圍**：僅 API 路由層的回應格式
