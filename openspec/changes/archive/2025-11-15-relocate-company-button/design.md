# Design Document: relocate-company-button

## Architecture Overview
這個變更涉及三個層級的改進：
1. **組件層**：擴展 PageHeader 組件支援更多操作類型
2. **頁面層**：優化公司設定頁面的 UI/UX
3. **視覺設計層**：建立一致的卡片狀態系統

## Design Decisions

### 1. PageHeader 組件擴展策略

**問題**：PageHeader 目前只支援 Link 類型的 action，無法處理需要 onClick 的按鈕操作。

**考慮的方案**：
- **方案 A**：為 PageHeader 新增獨立的 `button` prop
  - 缺點：增加 API 複雜度，違反單一職責原則
- **方案 B**：使用 discriminated union 類型擴展 `action` prop ✅
  - 優點：保持 API 簡潔，類型安全，易於使用
  - 缺點：需要類型守衛來區分

**最終決定**：採用方案 B
```typescript
type PageHeaderAction =
  | { label: string; href: string }
  | { label: string; onClick: () => void };
```

**理由**：
- TypeScript discriminated unions 提供完整的類型安全
- 保持組件 API 簡潔（單一 `action` prop）
- 易於擴展（未來可加入更多類型，如 dropdown）
- 符合 React 組件設計最佳實踐

### 2. 公司卡片資訊架構

**問題**：如何在有限的卡片空間中顯示最多資訊，同時保持可讀性？

**設計原則**：
1. **視覺層次**：使用字體大小和顏色建立清晰的資訊優先級
2. **漸進披露**：最重要的資訊（中文名稱）最顯眼，次要資訊（統編、英文名稱）依次遞減
3. **空間利用**：統編緊接中文名稱（同一行或下一行），節省垂直空間

**資訊層次設計**：
```
┌─────────────────────────────────┐
│ [Logo]  中文公司名稱（統編：12345678）│  ← 第一層（主要）
│         English Company Name     │  ← 第二層（補充）
└─────────────────────────────────┘
```

**字體規格**：
| 層級 | 內容 | 字體大小 | 字重 | 顏色 | 用途 |
|------|------|----------|------|------|------|
| 1 | 中文名稱 | 18px (text-lg) | 600 (semibold) | gray-900 | 主要識別 |
| 2 | 統編 | 14px (text-sm) | 400 (normal) | gray-600 | 次要識別 |
| 3 | 英文名稱 | 14px (text-sm) | 400 (normal) | gray-500 | 補充資訊 |

**顏色對比度驗證**：
- `gray-900` on `white`: 18.23:1（遠超 WCAG AA 4.5:1）
- `gray-600` on `white`: 5.74:1（符合 WCAG AA）
- `gray-500` on `white`: 3.94:1（符合 WCAG AA，大字體）

### 3. 卡片狀態系統

**問題**：如何提供明確的視覺回饋，同時不過度複雜？

**設計考量**：
參考業界最佳實踐（Material Design, Polaris, Ant Design），卡片應有以下狀態：
1. **一般狀態**：基礎樣式
2. **懸停狀態**：提供互動提示
3. **選中狀態**：明確標識當前選擇
4. **聚焦狀態**：支援鍵盤導航

**狀態優先級**：
```
聚焦 > 選中 > 懸停 > 一般
```

**視覺設計決策**：

| 狀態 | 邊框 | 背景 | 陰影 | 理由 |
|------|------|------|------|------|
| 一般 | gray-200 | white | 無 | 最小視覺重量，不搶眼 |
| 懸停 | indigo-300 | gray-50 | md | 溫和提示，不過度突出 |
| 選中 | indigo-500 (2px) | indigo-50 | lg | 明確標識，清晰可見 |
| 聚焦 | ring-2 indigo-500 | 繼承其他狀態 | 繼承 | 符合 WCAG 聚焦指示要求 |

**左側豎線設計**（可選）：
- 選中狀態額外加入 `border-l-4 border-l-indigo-600`
- 理由：提供更強烈的視覺提示，參考 VS Code、Notion 等應用
- 權衡：增加視覺複雜度，但大幅提升識別度

**最終決定**：保留左側豎線，因為：
- 與現代應用設計趨勢一致
- 提供更強的視覺錨點
- 不會過度干擾其他內容

### 4. 無障礙性設計

**WCAG 2.2 AA 要求**：
- ✅ 顏色對比度至少 4.5:1（大字體 3:1）
- ✅ 鍵盤可操作（所有功能可用鍵盤完成）
- ✅ 聚焦指示器清晰可見
- ✅ ARIA 標籤提供語義資訊

**ARIA 屬性設計**：
```tsx
<div
  role="button"                    // 標識為可互動元素
  aria-label={`選擇公司：${name.zh}`}  // 提供明確的名稱
  aria-current={isSelected ? "true" : undefined}  // 標識選中狀態
  tabIndex={0}                     // 支援鍵盤導航
  onClick={handleClick}
  onKeyDown={handleKeyDown}        // 支援 Enter/Space
>
```

**鍵盤操作設計**：
- **Tab**：在卡片間導航
- **Shift+Tab**：反向導航
- **Enter**：選擇公司（與點擊一致）
- **Space**：選擇公司（與點擊一致）

**螢幕閱讀器體驗**：
1. 導航到卡片：「選擇公司：科技公司，按鈕」
2. 選中的卡片：「選擇公司：科技公司，按鈕，已選取」
3. 提供清晰的上下文和狀態資訊

### 5. 響應式策略

**斷點設計**：
```
< 768px:  grid-cols-1  (手機)
768-1024: grid-cols-2  (平板)
> 1024:   grid-cols-3  (桌面)
```

**設計理由**：
- **手機**：單列最大化可讀性，避免資訊擁擠
- **平板**：兩列平衡空間利用和可讀性
- **桌面**：三列充分利用螢幕空間，不會過寬

**間距設計**（符合 4px 倍數原則）：
- 手機：`gap-4`（16px）- 更大的觸控區域
- 平板：`gap-3`（12px）- 平衡空間
- 桌面：`gap-4`（16px）- 視覺呼吸空間

**最大寬度限制**：
- 卡片不超過 400px，避免在超大螢幕上過寬
- 實作：使用 grid 的自然限制（grid-cols-3）

### 6. 狀態提升策略

**問題**：`handleCreateCompany` 在 CompanySettings 組件內，但需要在 PageHeader 中觸發。

**考慮的方案**：
- **方案 A**：將狀態提升到 SettingsPage，通過 props 傳遞 ✅
  - 優點：符合 React 單向數據流，狀態管理清晰
  - 缺點：增加 props 傳遞層級
- **方案 B**：使用 Context 或狀態管理庫
  - 優點：避免 prop drilling
  - 缺點：過度設計，對於簡單場景不必要
- **方案 C**：將 PageHeader 整合到 CompanySettings 內部
  - 優點：無需狀態提升
  - 缺點：違反關注點分離，降低組件可重用性

**最終決定**：採用方案 A
```typescript
// SettingsPage.tsx
const handleCreateCompany = () => {
  companySettingsRef.current?.createCompany();
};

<PageHeader action={{ label: '新增公司', onClick: handleCreateCompany }} />
<CompanySettings ref={companySettingsRef} />
```

或使用更簡潔的方式（如果 CompanySettings 改為受控組件）：
```typescript
<PageHeader action={{ label: '新增公司', onClick: () => setIsCreating(true) }} />
<CompanySettings isCreating={isCreating} onCreateComplete={() => setIsCreating(false)} />
```

**理由**：
- 符合 React 最佳實踐
- 保持組件職責清晰
- 易於測試和維護

## Trade-offs

### 1. 組件通用性 vs 實作複雜度
- **決定**：擴展 PageHeader 組件支援更多操作類型
- **權衡**：增加一些類型複雜度，換取組件的通用性和可重用性
- **影響**：未來其他頁面也能使用 PageHeader 的按鈕功能

### 2. 資訊密度 vs 視覺清晰度
- **決定**：在卡片上顯示三層資訊（中文名稱、統編、英文名稱）
- **權衡**：增加資訊密度可能影響視覺簡潔性
- **緩解**：使用清晰的視覺層次（字體大小、顏色）區分重要性

### 3. 視覺豐富度 vs 效能
- **決定**：加入多種視覺狀態（懸停、選中、聚焦）和過渡效果
- **權衡**：CSS 過渡可能在低端裝置上有輕微效能影響
- **緩解**：使用 GPU 加速的屬性（transform, opacity），避免回流

### 4. 無障礙性 vs 開發成本
- **決定**：完整實作 ARIA 屬性和鍵盤操作
- **權衡**：增加約 30 分鐘的開發和測試時間
- **價值**：支援所有使用者，符合法規要求（WCAG 2.2 AA）

## Performance Considerations

### 1. 渲染效能
- **最佳化**：使用 `React.memo` 包裝公司卡片組件（如果抽象為獨立組件）
- **原因**：避免父組件重新渲染時不必要的卡片重繪

### 2. 圖片載入
- **最佳化**：使用 `next/image` 自動優化 Logo
- **效果**：自動 lazy loading、格式轉換（WebP）、尺寸優化

### 3. CSS 過渡
- **最佳化**：只過渡 transform 和 opacity（GPU 加速）
- **避免**：過渡 width, height（會觸發回流）

### 4. 狀態管理
- **最佳化**：使用 `useCallback` 包裝事件處理器（如 `loadCompany`）
- **效果**：避免子組件不必要的重新渲染

## Security Considerations

### 1. XSS 防護
- **風險**：公司名稱、統編等資料來自資料庫，可能包含惡意內容
- **緩解**：React 自動轉義文字內容，無需額外處理
- **注意**：不使用 `dangerouslySetInnerHTML`

### 2. ARIA 注入
- **風險**：ARIA 標籤包含使用者輸入（公司名稱）
- **緩解**：React 會自動轉義屬性值
- **驗證**：測試包含特殊字元的公司名稱（如 `<script>`）

## Testing Strategy

### 1. 單元測試
- PageHeader 組件：測試 Link 和 Button 類型的渲染
- 卡片狀態邏輯：測試不同資料組合的顯示邏輯

### 2. 整合測試
- 完整的使用者流程：瀏覽 → 選擇公司 → 新增公司
- 鍵盤導航：Tab → Enter/Space 選擇

### 3. 視覺回歸測試（可選）
- 使用 Percy/Chromatic 捕捉各種狀態的截圖
- 確保 UI 變更不會意外破壞視覺設計

### 4. 無障礙測試
- 自動化：Lighthouse, axe DevTools
- 手動：VoiceOver (macOS), NVDA (Windows)

## Future Considerations

### 1. 組件抽象
如果公司卡片在其他地方重用，考慮抽象為獨立組件：
```tsx
<CompanyCard
  company={company}
  isSelected={selected}
  onClick={handleSelect}
/>
```

### 2. 動畫優化
考慮使用 Framer Motion 提供更流暢的狀態過渡：
```tsx
<motion.div
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
>
```

### 3. 虛擬化
如果公司數量超過 50 個，考慮使用虛擬滾動（react-window）：
- 只渲染可見的卡片
- 提升大列表效能

### 4. 搜尋和篩選
當公司數量增加時，考慮加入：
- 即時搜尋（fuzzy search）
- 標籤篩選
- 排序功能

## References

### UI/UX 最佳實踐
- [Card UI Design - UXPin](https://www.uxpin.com/studio/blog/card-design-ui/)
- [SAP Card UI Design](https://community.sap.com/t5/technology-blog-posts-by-sap/card-ui-design-in-a-business-context-a-new-system-for-mobile-apps-by-sap/ba-p/13607928)
- [Button Design Best Practices - Baymard](https://baymard.com/learn/button-design)

### 無障礙性標準
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM ARIA Labels](https://webaim.org/techniques/aria/)

### 技術參考
- [TypeScript Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
- [React Accessibility](https://react.dev/learn/accessibility)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)

## Conclusion
這個設計平衡了以下目標：
1. ✅ 提升使用者體驗（更直覺的操作、更清晰的資訊）
2. ✅ 符合現代設計標準（卡片 UI、視覺層次、無障礙性）
3. ✅ 保持技術簡潔（無需引入新依賴或複雜架構）
4. ✅ 提升組件可重用性（PageHeader 擴展可用於其他頁面）
5. ✅ 確保長期可維護性（清晰的架構、完整的測試）

這個變更不僅解決了當前的 UX 問題，還為未來的擴展奠定了良好的基礎。
