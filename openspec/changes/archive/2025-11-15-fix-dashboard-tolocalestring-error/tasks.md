# 任務清單：修復儀表板 toLocaleString 錯誤

## Phase 1: 建立格式化工具函數

### Task 1.1: 建立格式化工具檔案
- [x] 建立 `lib/utils/formatters.ts`
- [x] 實作 `safeToLocaleString()` 函數
- [x] 實作 `formatCurrency()` 函數
- [x] 實作 `formatPercentage()` 函數
- [x] 加入完整的 TypeScript 型別定義
- [x] 加入 JSDoc 註解說明函數用途

**驗證標準**：
- 函數能正確處理 undefined、null、NaN、Infinity
- TypeScript 編譯無錯誤
- 函數回傳值符合預期格式

**預估時間**：30 分鐘

---

### Task 1.2: 建立格式化工具測試
- [ ] 建立 `lib/utils/__tests__/formatters.test.ts`
- [ ] 測試 `safeToLocaleString()` 的各種情況
- [ ] 測試 `formatCurrency()` 的各種情況
- [ ] 測試 `formatPercentage()` 的各種情況
- [ ] 包含邊緣情況測試（undefined, null, NaN, Infinity）

**驗證標準**：
- 所有測試通過
- 測試覆蓋率 > 90%
- 邊緣情況都有對應測試

**預估時間**：30 分鐘

---

## Phase 2: 更新圖表組件

### Task 2.1: 更新 CurrencyChart.tsx
- [x] 導入格式化工具函數
- [x] 替換 Tooltip 中的 `toLocaleString()` 為 `safeToLocaleString()`（第 92 行）
- [x] 檢查並更新其他可能使用 `toLocaleString()` 的地方
- [x] 確保所有數值都經過安全處理
- [x] 執行 TypeScript 類型檢查

**驗證標準**：
- 無 TypeScript 錯誤
- Tooltip 正確顯示格式化數值
- 不再出現 undefined 錯誤

**預估時間**：30 分鐘

---

### Task 2.2: 更新 RevenueChart.tsx
- [x] 導入格式化工具函數
- [x] 更新 `formatCurrency` 本地函數使用 `safeToLocaleString()`
- [x] 確保 Y 軸格式化器使用安全方法
- [x] 更新 Tooltip 中的數值格式化
- [x] 執行 TypeScript 類型檢查

**驗證標準**：
- 無 TypeScript 錯誤
- 圖表正確顯示
- Y 軸和 Tooltip 數值格式正確

**預估時間**：30 分鐘

---

### Task 2.3: 更新 StatusChart.tsx
- [x] 導入格式化工具函數
- [x] 更新 `formatCurrency` 本地函數使用 `safeToLocaleString()`
- [x] 更新狀態摘要卡片中的數值格式化（第 152 行）
- [x] 確保 Tooltip 使用安全格式化
- [x] 執行 TypeScript 類型檢查

**驗證標準**：
- 無 TypeScript 錯誤
- 圖表和摘要卡片正確顯示
- 所有數值格式化安全

**預估時間**：30 分鐘

---

### Task 2.4: 檢查 DashboardClient.tsx
- [x] 檢查 `formatCurrency` 函數（第 171-174 行）
- [x] 確認是否需要更新為使用共用工具函數
- [x] 檢查 AlertCard 中的數值格式化（第 148 行）
- [x] 執行 TypeScript 類型檢查

**驗證標準**：
- 無 TypeScript 錯誤
- 所有數值格式化一致且安全

**預估時間**：15 分鐘

---

## Phase 3: 測試和驗證

### Task 3.1: 本地開發環境測試
- [ ] 執行 `pnpm run dev` 啟動開發伺服器
- [ ] 開啟 Chrome DevTools
- [ ] 訪問儀表板頁面
- [ ] 驗證無 Console 錯誤
- [ ] 測試所有圖表互動功能（Tooltip, Legend）
- [ ] 測試不同的資料狀態（空資料、部分資料、完整資料）

**驗證標準**：
- 儀表板頁面正常顯示
- 所有圖表正確渲染
- Tooltip 正確顯示格式化數值
- Console 無錯誤訊息

**預估時間**：30 分鐘

---

### Task 3.2: 執行完整測試套件
- [ ] 執行 `pnpm run test` 運行所有測試
- [ ] 確認新增的測試全部通過
- [ ] 確認沒有破壞現有測試
- [ ] 檢查測試覆蓋率報告

**驗證標準**：
- 所有測試通過
- 新增測試覆蓋核心功能
- 沒有回歸問題

**預估時間**：15 分鐘

---

### Task 3.3: 執行 Lint 和 TypeCheck
- [x] 執行 `pnpm run lint`
- [x] 執行 `pnpm run typecheck`
- [x] 修正任何發現的問題

**驗證標準**：
- Lint 無錯誤和警告
- TypeScript 編譯無錯誤
- 程式碼符合專案規範

**預估時間**：15 分鐘

---

### Task 3.4: 整合測試
- [ ] 清除瀏覽器快取
- [ ] 重新整理儀表板頁面
- [ ] 測試各種使用者情境：
  - 首次載入
  - 資料刷新
  - 網路延遲模擬
  - 不同語言切換
- [ ] 使用 Chrome DevTools Performance 檢查效能
- [ ] 確認沒有記憶體洩漏

**驗證標準**：
- 所有使用者情境正常運作
- 效能無明顯下降
- 無記憶體洩漏

**預估時間**：30 分鐘

---

## Phase 4: 文件更新（選擇性）

### Task 4.1: 更新開發文件
- [ ] 在 `CLAUDE.md` 中記錄數值格式化最佳實踐
- [ ] 更新 `DEPLOYMENT_CHECKLIST.md` 加入格式化工具使用指引
- [ ] 建立使用範例

**驗證標準**：
- 文件清晰易懂
- 包含實際使用範例
- 其他開發者能快速理解

**預估時間**：15 分鐘

---

## 總結

**總預估時間**：約 4 小時

**關鍵里程碑**：
1. ✅ Phase 1 完成 - 格式化工具建立（1 小時）
2. ✅ Phase 2 完成 - 所有組件更新（1.75 小時）
3. ✅ Phase 3 完成 - 完整測試驗證（1.5 小時）
4. ✅ Phase 4 完成 - 文件更新（15 分鐘）

**依賴關係**：
- Task 2.x 依賴 Task 1.1 完成
- Task 3.x 依賴 Task 2.x 完成
- Task 4.1 可與其他 Task 平行進行

**風險點**：
- Task 2.x：確保不破壞現有功能
- Task 3.1：可能發現額外需要修正的地方
