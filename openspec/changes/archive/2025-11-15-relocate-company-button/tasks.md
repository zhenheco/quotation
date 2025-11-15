# Implementation Tasks: relocate-company-button

## Checklist

### Phase 1: API 確認與準備（預估：15 分鐘）
- [ ] 1.1 確認 API 回傳資料
  - [ ] 檢查 `/api/companies` 是否回傳 `tax_id` 欄位
  - [ ] 如果沒有，修改 API 以包含 `tax_id`
  - [ ] 驗證 API 回傳的資料結構符合預期

### Phase 2: PageHeader 組件擴展（預估：30 分鐘）
- [ ] 2.1 擴展 PageHeader 組件類型定義
  - [ ] 修改 `PageHeaderProps.action` 支援兩種類型：Link (`href`) 和 Button (`onClick`)
  - [ ] 定義類型：`type Action = { label: string } & ({ href: string } | { onClick: () => void })`
  - [ ] 更新 TypeScript 類型，確保類型安全

- [ ] 2.2 實作 PageHeader 按鈕渲染邏輯
  - [ ] 使用類型守衛區分 Link 和 Button
  - [ ] Button 樣式保持與 Link 一致（`bg-indigo-600`, `hover:bg-indigo-700`）
  - [ ] 加入適當的 `type="button"` 屬性避免表單提交

- [ ] 2.3 測試 PageHeader 組件
  - [ ] 測試 Link 類型的 action（現有功能不受影響）
  - [ ] 測試 Button 類型的 action（onClick 事件正常觸發）
  - [ ] 驗證樣式一致性

### Phase 3: 整合「新增公司」按鈕到 PageHeader（預估：15 分鐘）
- [ ] 3.1 移除舊的按鈕位置
  - [ ] 刪除 CompanySettings.tsx 中第 280-285 行的按鈕
  - [ ] 保留「我的公司」區塊標題

- [ ] 3.2 整合到 PageHeader
  - [ ] 在 settings/page.tsx 中傳遞 `action` prop 給 PageHeader
  - [ ] 使用 `onClick` 類型，觸發 CompanySettings 的 `handleCreateCompany`
  - [ ] 處理狀態提升（將 `handleCreateCompany` 暴露給父組件）

### Phase 4: 優化公司卡片 UI（預估：1 小時）
- [ ] 4.1 重構卡片資訊架構（依照視覺層次）
  - [ ] **第一層（主要）**：中文公司名稱
    - [ ] 字體大小：`text-lg`（18px）
    - [ ] 字重：`font-semibold`（600）
    - [ ] 顏色：`text-gray-900`（深色，最顯眼）

  - [ ] **第二層（次要）**：統一編號
    - [ ] 格式：`（統編：12345678）` 或 `(Tax ID: 12345678)`
    - [ ] 字體大小：`text-sm`（14px）
    - [ ] 字重：`font-normal`（400）
    - [ ] 顏色：`text-gray-600`（中等灰色）
    - [ ] 位置：緊接在中文名稱後面，或換行顯示（依空間決定）

  - [ ] **第三層（補充）**：英文公司名稱
    - [ ] 字體大小：`text-sm`（14px）
    - [ ] 字重：`font-normal`（400）
    - [ ] 顏色：`text-gray-500`（淺灰色）
    - [ ] 位置：單獨一行，在中文名稱和統編下方

- [ ] 4.2 處理邊界情況
  - [ ] 當 `tax_id` 為空：只顯示公司名稱，不顯示括號
  - [ ] 當 `name.en` 為空：不顯示第三層，只保留兩層
  - [ ] 當 `name.zh` 為空但 `name.en` 有值：使用 `name.en` 作為主要名稱
  - [ ] 當 Logo 為空：顯示預設圖示（🏢）

- [ ] 4.3 增強卡片視覺狀態
  - [ ] **一般狀態**（未選中）：
    - [ ] 邊框：`border-gray-200`
    - [ ] 背景：`bg-white`
    - [ ] 陰影：無

  - [ ] **懸停狀態**（hover）：
    - [ ] 邊框：`hover:border-indigo-300`
    - [ ] 背景：`hover:bg-gray-50`
    - [ ] 陰影：`hover:shadow-md`（中等陰影，提升層次感）
    - [ ] 過渡：`transition-all duration-200`

  - [ ] **選中狀態**（selected）：
    - [ ] 邊框：`border-indigo-500`（2px 寬度，使用 `border-2`）
    - [ ] 背景：`bg-indigo-50`（淺藍色背景，明確標識）
    - [ ] 陰影：`shadow-lg`（較大陰影，更顯眼）
    - [ ] 可選：加入左側藍色豎線（`border-l-4 border-l-indigo-600`）

  - [ ] **聚焦狀態**（focus，鍵盤導航）：
    - [ ] 使用 `focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`
    - [ ] 確保聚焦環清晰可見，符合 WCAG 2.2 標準

### Phase 5: 無障礙性改善（預估：30 分鐘）
- [ ] 5.1 加入 ARIA 屬性
  - [ ] 為公司卡片加入 `role="button"`（可點擊元素）
  - [ ] 為公司卡片加入 `aria-label`：`「選擇公司：{公司名稱}」`
  - [ ] 為選中的卡片加入 `aria-current="true"`
  - [ ] 為卡片加入 `tabIndex={0}`，支援鍵盤導航（Tab 鍵）

- [ ] 5.2 支援鍵盤操作
  - [ ] 加入 `onKeyDown` 處理器，監聽 Enter 和 Space 鍵
  - [ ] 按下 Enter 或 Space 時觸發 `loadCompany`（與點擊行為一致）
  - [ ] 確保 Tab 導航順序合理（從上到下，從左到右）

- [ ] 5.3 驗證無障礙性
  - [ ] 使用螢幕閱讀器測試（VoiceOver / NVDA）
  - [ ] 使用鍵盤導航測試（Tab, Enter, Space）
  - [ ] 確保所有互動元素都有明確的可訪問名稱（accessible name）
  - [ ] 使用 Lighthouse 或 axe DevTools 檢查無障礙性評分

### Phase 6: 響應式佈局優化（預估：15 分鐘）
- [ ] 6.1 確認不同螢幕尺寸下的佈局
  - [ ] **手機**（< 768px）：
    - [ ] 卡片全寬顯示（`grid-cols-1`）
    - [ ] 文字大小適中，不會過小
    - [ ] 確保觸控區域足夠大（最小 44x44px）

  - [ ] **平板**（768px - 1024px）：
    - [ ] 卡片 2 列顯示（`md:grid-cols-2`）
    - [ ] 卡片間距合理（8px 或 12px）

  - [ ] **桌面**（> 1024px）：
    - [ ] 卡片 3 列顯示（`lg:grid-cols-3`）
    - [ ] 確保卡片寬度不會過寬（最大 400px）

- [ ] 6.2 測試響應式佈局
  - [ ] 使用 Chrome DevTools 的裝置模擬器測試各種螢幕尺寸
  - [ ] 確保在不同尺寸下資訊不會被截斷或重疊

### Phase 7: 測試與驗證（預估：45 分鐘）
- [ ] 7.1 功能測試
  - [ ] 測試新增公司按鈕點擊：開啟新增表單
  - [ ] 測試公司卡片點擊：載入公司資料
  - [ ] 測試選中狀態：正確標識當前選中的公司
  - [ ] 測試鍵盤導航：Tab, Enter, Space 正常運作

- [ ] 7.2 資料測試
  - [ ] 測試完整資料（中文名稱 + 英文名稱 + 統編 + Logo）
  - [ ] 測試缺少統編的公司
  - [ ] 測試缺少英文名稱的公司
  - [ ] 測試缺少 Logo 的公司
  - [ ] 測試只有英文名稱的公司（極端情況）

- [ ] 7.3 視覺測試
  - [ ] 使用 Chrome DevTools 檢查 CSS 樣式是否正確應用
  - [ ] 確認視覺層次清晰（中文名稱 > 統編 > 英文名稱）
  - [ ] 確認選中、懸停、聚焦狀態視覺回饋明確
  - [ ] 確認顏色對比度符合 WCAG AA 標準（使用對比度檢查工具）

- [ ] 7.4 無障礙測試
  - [ ] 使用螢幕閱讀器驗證所有資訊都能被正確讀取
  - [ ] 使用鍵盤完成完整的操作流程（導航、選擇、新增）
  - [ ] 使用 Lighthouse 無障礙性評分：目標 > 90 分
  - [ ] 使用 axe DevTools 檢查：無嚴重或中等錯誤

- [ ] 7.5 多語系測試
  - [ ] 測試中文語系（zh）：介面和資料顯示正確
  - [ ] 測試英文語系（en）：介面和資料顯示正確
  - [ ] 確認語系切換時卡片顯示保持一致（仍顯示中英文名稱）

- [ ] 7.6 響應式測試
  - [ ] 測試手機尺寸（375px, 414px）
  - [ ] 測試平板尺寸（768px, 1024px）
  - [ ] 測試桌面尺寸（1280px, 1920px）
  - [ ] 確認在所有尺寸下佈局正確且可用

### Phase 8: 代碼品質與優化（預估：15 分鐘）
- [ ] 8.1 代碼檢查
  - [ ] 執行 `pnpm run lint` 確保無 ESLint 錯誤
  - [ ] 執行 `pnpm run typecheck` 確保無 TypeScript 類型錯誤
  - [ ] 檢查無未使用的導入、變數、函式
  - [ ] 確認所有註解清晰且必要

- [ ] 8.2 效能優化
  - [ ] 確認未引入不必要的重新渲染
  - [ ] 確認 `useCallback` 和 `useMemo` 使用得當（如適用）
  - [ ] 確認圖片使用 `next/image` 優化（Logo）

- [ ] 8.3 程式碼整潔度
  - [ ] 移除 console.log（保留必要的錯誤處理）
  - [ ] 確保命名清晰且一致
  - [ ] 確保縮排和格式化正確（Prettier）

## Dependencies
### 內部依賴
- PageHeader 組件擴展（必須先完成）
- API 回傳 `tax_id` 欄位（如果沒有，需先修改 API）

### 外部依賴
無

## Validation Criteria
### 功能性
- ✅ 新增公司按鈕在 PageHeader 中，點擊開啟新增表單
- ✅ 公司卡片顯示中文名稱、統編、英文名稱（依資料完整度）
- ✅ 選中公司時視覺狀態明確
- ✅ 鍵盤導航完全可用（Tab, Enter, Space）

### 視覺設計
- ✅ 資訊層次清晰（字體大小、顏色對比）
- ✅ 選中、懸停、聚焦狀態視覺回饋明確
- ✅ 響應式佈局在所有裝置上正確顯示
- ✅ 顏色對比度符合 WCAG AA 標準（至少 4.5:1）

### 無障礙性
- ✅ 所有互動元素都有 ARIA 標籤
- ✅ 螢幕閱讀器可正確讀取所有資訊
- ✅ 鍵盤導航順序合理
- ✅ Lighthouse 無障礙性評分 > 90

### 代碼品質
- ✅ 無 ESLint 錯誤
- ✅ 無 TypeScript 類型錯誤
- ✅ 無未使用的導入或變數
- ✅ 程式碼整潔且易於維護

## Rollback Plan
如果實作過程中遇到問題，可以分階段回退：
1. **回退整個變更**：恢復所有檔案到原始狀態
2. **只保留按鈕位置調整**：如果卡片優化有問題，可以先只實作按鈕整合
3. **段階式上線**：先部署到測試環境，驗證無誤後再部署到生產環境

## Post-Implementation
完成後建議進行的後續工作：
- [ ] 更新使用者文件（如適用）
- [ ] 收集使用者回饋
- [ ] 考慮實作進階功能（如公司搜尋、快捷鍵、空狀態插圖）
- [ ] 考慮將卡片組件抽象為可重用組件（`CompanyCard.tsx`）
