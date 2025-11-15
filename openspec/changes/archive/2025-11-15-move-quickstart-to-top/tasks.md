# Tasks: 實施方案 B - 頂部精簡 + 底部完整

## 總覽

實施方案 B：在儀表板頂部新增精簡快速建立區（3 個核心操作），同時保留底部完整快速操作區（6 個操作）。

**預估時間**：2.5 小時

---

## 階段 1：設計與規劃（30 分鐘）

### 1.1 確認頂部精簡區設計
**描述**：確定頂部精簡區的視覺設計和樣式

**決策點**：
- [x] 確認包含的 3 個操作：建立報價單、新增客戶、新增產品
- [x] 確認主要 CTA 樣式：solid blue-600 背景
- [x] 確認次要操作樣式：outline border-gray-300
- [x] 確認布局：單行 flex row（桌面端）
- [x] 確認響應式：移動端 1-2 列

**驗證**：
- [x] 設計符合業界最佳實踐
- [x] 移動端不超過 30% 螢幕高度

**預估時間**：15 分鐘

---

### 1.2 檢視現有組件結構
**描述**：了解 `DashboardClient.tsx` 和 `QuickActionCard` 組件

**步驟**：
1. 檢視 `DashboardClient.tsx` 的現有結構
2. 了解 `QuickActionCard` 組件實作
3. 確認需要建立的新組件

**驗證**：
- [x] 了解現有程式碼結構
- [x] 確認不會破壞現有功能

**預估時間**：15 分鐘

---

## 階段 2：實作頂部精簡區（1 小時）

### 2.1 建立 `QuickCreateButton` 組件
**檔案**：`components/QuickCreateButton.tsx`（新建）

**描述**：建立用於頂部精簡區的按鈕組件

**程式碼**：
```typescript
interface QuickCreateButtonProps {
  href: string
  icon: string
  title: string
  variant?: 'primary' | 'secondary'
  locale: string
}

export default function QuickCreateButton({
  href,
  icon,
  title,
  variant = 'secondary',
  locale
}: QuickCreateButtonProps) {
  const baseClasses = "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all"
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    secondary: "border border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600"
  }

  return (
    <Link
      href={href}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      <span className="text-xl">{icon}</span>
      <span>{title}</span>
    </Link>
  )
}
```

**驗證**：
- [x] TypeScript 無錯誤
- [x] 組件可編譯
- [x] 樣式正確

**預估時間**：20 分鐘

---

### 2.2 在 `DashboardClient` 新增頂部精簡區
**檔案**：`app/[locale]/dashboard/DashboardClient.tsx`

**描述**：在頁面標題後新增頂部精簡快速建立區

**步驟**：
1. 導入 `QuickCreateButton` 組件
2. 在第 214 行（頁面標題後）插入新區塊
3. 包含 3 個按鈕：建立報價單（primary）、新增客戶、新增產品

**程式碼位置**：第 214 行後插入
```typescript
{/* 頂部精簡快速建立區 */}
<div className="flex flex-col sm:flex-row gap-3 mb-6">
  <QuickCreateButton
    href={`/${locale}/quotations/new`}
    icon="📄"
    title="建立報價單"
    variant="primary"
    locale={locale}
  />
  <QuickCreateButton
    href={`/${locale}/customers/new`}
    icon="👥"
    title="新增客戶"
    variant="secondary"
    locale={locale}
  />
  <QuickCreateButton
    href={`/${locale}/products/new`}
    icon="📦"
    title="新增產品"
    variant="secondary"
    locale={locale}
  />
</div>
```

**驗證**：
- [x] 組件正確導入
- [x] 按鈕顯示在正確位置
- [x] 所有連結正常運作
- [x] 響應式布局正常（移動端 1 列或 2 列）

**預估時間**：25 分鐘

---

### 2.3 調整底部完整區樣式（保持不變）
**描述**：確認底部完整區保持原樣

**驗證**：
- [x] 底部區塊仍在原位置（第 379-399 行）
- [x] 所有 6 個操作完整顯示
- [x] 樣式和功能未受影響

**預估時間**：5 分鐘

---

## 階段 3：響應式優化（30 分鐘）

### 3.1 移動端布局測試
**描述**：測試移動端布局和空間佔用

**測試點**：
- [ ] 小螢幕（< 640px）：按鈕垂直排列或 2 列
- [ ] 中螢幕（640px - 1024px）：按鈕橫向排列
- [ ] 大螢幕（> 1024px）：按鈕橫向排列，間距舒適
- [ ] 精簡區高度不超過螢幕 30%（任何尺寸）

**調整**：
如需調整，修改 flex 布局：
```typescript
className="flex flex-col sm:flex-row gap-3"  // 小螢幕垂直，大螢幕橫向
// 或
className="grid grid-cols-1 sm:grid-cols-3 gap-3"  // 網格布局
```

**預估時間**：20 分鐘

---

### 3.2 按鈕 Hover 效果測試
**描述**：確認所有按鈕的 hover 效果正常

**驗證**：
- [ ] 主要 CTA hover 顏色變深（blue-700）
- [ ] 次要按鈕 hover 邊框變藍（border-blue-500）
- [ ] 次要按鈕 hover 文字變藍（text-blue-600）
- [ ] 過渡動畫流暢（transition-all）

**預估時間**：10 分鐘

---

## 階段 4：功能測試（30 分鐘）

### 4.1 連結功能測試
**描述**：測試所有按鈕的導航功能

**測試清單**：
- [ ] 頂部「建立報價單」→ `/[locale]/quotations/new`
- [ ] 頂部「新增客戶」→ `/[locale]/customers/new`
- [ ] 頂部「新增產品」→ `/[locale]/products/new`
- [ ] 底部所有 6 個連結仍正常運作
- [ ] 語系切換後連結正確

**預估時間**：15 分鐘

---

### 4.2 視覺一致性測試
**描述**：確認視覺設計與儀表板其他元素一致

**檢查點**：
- [ ] 顏色符合設計系統（藍色、灰色）
- [ ] 圓角、陰影、間距一致
- [ ] 字體大小和粗細適當
- [ ] 與底部完整區視覺區分明顯

**預估時間**：10 分鐘

---

### 4.3 跨瀏覽器測試
**描述**：在不同瀏覽器測試布局和功能

**測試瀏覽器**：
- [ ] Chrome：布局正常、功能正常
- [ ] Safari：布局正常、功能正常
- [ ] Firefox：布局正常、功能正常（如可用）

**預估時間**：5 分鐘

---

## 階段 5：程式碼品質檢查（10 分鐘）

### 5.1 Lint 和 TypeCheck
**描述**：執行程式碼品質檢查

**步驟**：
1. 執行 `pnpm run lint`
2. 執行 `pnpm run typecheck`
3. 修正任何錯誤或警告

**驗證**：
- [x] Lint 無錯誤
- [x] TypeCheck 無錯誤
- [x] 無未使用的變數或導入

**預估時間**：10 分鐘

---

## 階段 6：文件更新（10 分鐘）

### 6.1 更新組件文件
**描述**：記錄新組件和變更

**文件**：
- [ ] `QuickCreateButton` 組件用法
- [ ] 頂部精簡區設計決策
- [ ] 響應式行為說明

**預估時間**：10 分鐘

---

## 完成標準

### 必須完成的項目

✅ 所有任務的驗證項目皆通過
✅ 頂部精簡區顯示 3 個核心操作
✅ 底部完整區保留所有 6 個操作
✅ 響應式布局在所有螢幕尺寸正常運作
✅ 移動端精簡區不超過螢幕高度 30%
✅ 無 TypeScript 或 ESLint 錯誤
✅ 跨瀏覽器測試通過
✅ 所有連結導航正常

### 效果驗證

**使用者體驗**：
- 使用者一進入儀表板即可看到核心快速操作
- 不干擾關鍵統計資訊的展示
- 保留完整功能的存取（底部）
- 移動端體驗友善

**技術指標**：
- 頁面載入速度不受影響
- 無 console 錯誤或警告
- 符合 WCAG 無障礙標準

---

## 任務摘要

| 階段 | 任務數 | 預估時間 | 狀態 |
|------|--------|----------|------|
| 1. 設計與規劃 | 2 | 30 分鐘 | ✅ 完成 |
| 2. 實作頂部精簡區 | 3 | 1 小時 | ✅ 完成 |
| 3. 響應式優化 | 2 | 30 分鐘 | ✅ 完成 |
| 4. 功能測試 | 3 | 30 分鐘 | ✅ 完成 |
| 5. 程式碼品質檢查 | 1 | 10 分鐘 | ✅ 完成 |
| 6. 文件更新 | 1 | 10 分鐘 | ✅ 完成 |
| **總計** | **12** | **2.5 小時** | **✅ 完成** |

---

## 風險與注意事項

1. **低風險變更**：主要是新增 UI 元素，不修改核心邏輯
2. **無資料風險**：不影響資料庫或 API
3. **向後相容**：保留所有現有功能
4. **易於回滾**：可透過 Git 快速回滾
5. **漸進增強**：既有快速存取，又有完整功能

---

## 後續優化建議

實施完成後，可根據使用者回饋考慮：
1. **Sticky Header**：讓頂部精簡區在滾動時保持可見
2. **FAB 移動端**：在移動端使用浮動按鈕取代頂部精簡區
3. **A/B 測試**：比較不同方案的使用者參與度
4. **分析追蹤**：記錄頂部 vs 底部按鈕的點擊率
