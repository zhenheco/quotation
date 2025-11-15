# Spec Delta: company-settings-ui

## ADDED Requirements

### Requirement: PageHeader 組件擴展支援按鈕操作
系統 MUST 擴展 PageHeader 組件以支援 button 類型的 action，除了現有的 Link (`href`) 之外，還需支援 onClick 事件處理。

#### Scenario: PageHeader 支援 Link 類型的 action
**Given** 頁面使用 PageHeader 組件並傳遞 `action={{ label: '新增', href: '/create' }}`
**When** 頁面渲染
**Then** PageHeader 應顯示一個 Link 元素，點擊後導航到指定路徑

#### Scenario: PageHeader 支援 Button 類型的 action
**Given** 頁面使用 PageHeader 組件並傳遞 `action={{ label: '新增', onClick: handleCreate }}`
**When** 頁面渲染
**Then** PageHeader 應顯示一個 Button 元素，點擊後觸發 onClick 回調函式

#### Scenario: PageHeader action 樣式一致性
**Given** PageHeader 渲染 Link 或 Button 類型的 action
**When** 使用者查看頁面
**Then** 兩種類型的視覺樣式應完全一致（背景色、文字顏色、間距、圓角、hover 效果）

## MODIFIED Requirements

### Requirement: 公司設定頁面操作按鈕位置
系統 MUST 將「新增公司」按鈕整合到 PageHeader 組件中，遵循頁面層級操作模式的設計慣例。

#### Scenario: 新增公司按鈕位於 PageHeader 區域
**Given** 使用者進入系統設定頁面（`/settings`）
**When** 頁面載入完成
**Then** 「新增公司」按鈕 MUST 顯示在 PageHeader 組件的右側區域
**And** 按鈕 MUST 使用 `onClick` 事件類型（而非 Link）
**And** 點擊按鈕 MUST 觸發開啟新增公司表單的操作

#### Scenario: 移除舊的按鈕位置
**Given** 使用者進入系統設定頁面
**When** 頁面載入完成
**Then** 「我的公司」區塊內 MUST NOT 包含「新增公司」按鈕
**And** 「我的公司」標題 MUST 保留且正常顯示

### Requirement: 公司卡片資訊架構與視覺層次
系統 MUST 優化公司卡片的資訊顯示，建立清晰的視覺層次（size, color, typography），符合企業應用的卡片 UI 最佳實踐。

#### Scenario: 公司卡片顯示完整資訊（標準情況）
**Given** 公司資料包含中文名稱、英文名稱和統一編號
**When** 公司卡片渲染
**Then** 卡片 MUST 顯示以下三層資訊：
- **第一層**：中文公司名稱（`text-lg font-semibold text-gray-900`）
- **第二層**：統一編號，格式為 `（統編：12345678）` 或 `(Tax ID: 12345678)`（`text-sm text-gray-600`）
- **第三層**：英文公司名稱（`text-sm text-gray-500`）

**And** 統一編號 MUST 顯示在中文名稱的同一行（空間足夠時）或下一行（空間不足時）
**And** 英文名稱 MUST 顯示在單獨的一行

#### Scenario: 公司卡片處理缺少統一編號的情況
**Given** 公司資料中 `tax_id` 為 `null` 或 `undefined` 或空字串
**When** 公司卡片渲染
**Then** 卡片 MUST 只顯示兩層資訊：
- 第一層：中文公司名稱
- 第二層：英文公司名稱（如果有）

**And** MUST NOT 顯示括號或 "統編：" 文字

#### Scenario: 公司卡片處理缺少英文名稱的情況
**Given** 公司資料中 `name.en` 為 `null` 或 `undefined` 或空字串
**When** 公司卡片渲染
**Then** 卡片 MUST 只顯示兩層資訊：
- 第一層：中文公司名稱
- 第二層：統一編號（如果有）

**And** MUST NOT 顯示空白的第三層

#### Scenario: 公司卡片處理極端情況（只有英文名稱）
**Given** 公司資料中 `name.zh` 為空但 `name.en` 有值
**When** 公司卡片渲染
**Then** 卡片 MUST 使用 `name.en` 作為第一層（主要名稱）
**And** 如果有統一編號，MUST 顯示為第二層

#### Scenario: 公司卡片顯示 Logo（有 Logo 的情況）
**Given** 公司資料包含 `logo_url`
**When** 公司卡片渲染
**Then** 卡片 MUST 在左側顯示公司 Logo（使用 `next/image` 組件）
**And** Logo MUST 為圓形（`rounded-full`），尺寸為 48x48px
**And** Logo MUST 與文字資訊水平對齊

#### Scenario: 公司卡片處理無 Logo 的情況
**Given** 公司資料中 `logo_url` 為 `null` 或 `undefined`
**When** 公司卡片渲染
**Then** 卡片 MUST 顯示預設圖示（🏢 emoji）
**And** 預設圖示 MUST 顯示在圓形背景中（`bg-gray-200`），尺寸與 Logo 一致

### Requirement: 公司卡片視覺狀態回饋
系統 MUST 為公司卡片提供明確的視覺狀態回饋，包括一般、懸停、選中和聚焦狀態，參考現代卡片 UI 設計模式。

#### Scenario: 公司卡片一般狀態（未選中）
**Given** 公司卡片未被選中
**When** 使用者查看頁面
**Then** 卡片 MUST 顯示以下樣式：
- 邊框：`border border-gray-200`
- 背景：`bg-white`
- 陰影：無（`shadow-none`）

#### Scenario: 公司卡片懸停狀態
**Given** 使用者將滑鼠懸停在公司卡片上
**When** 懸停事件觸發
**Then** 卡片 MUST 顯示以下樣式：
- 邊框：`border-indigo-300`
- 背景：`bg-gray-50`
- 陰影：`shadow-md`
- 過渡：`transition-all duration-200`（平滑過渡效果）

**And** 滑鼠游標 MUST 變為指針（`cursor-pointer`）

#### Scenario: 公司卡片選中狀態
**Given** 使用者已選中某個公司
**When** 該公司的卡片渲染
**Then** 卡片 MUST 顯示以下樣式：
- 邊框：`border-2 border-indigo-500`（2px 寬度的藍色邊框）
- 背景：`bg-indigo-50`（淺藍色背景）
- 陰影：`shadow-lg`（較大陰影，提升層次感）
- 左側豎線：`border-l-4 border-l-indigo-600`（可選，增強視覺識別）

**And** 選中狀態 MUST 優先於懸停狀態（即使懸停，仍保持選中樣式）

#### Scenario: 公司卡片聚焦狀態（鍵盤導航）
**Given** 使用者使用 Tab 鍵導航到公司卡片
**When** 卡片獲得鍵盤聚焦
**Then** 卡片 MUST 顯示聚焦環：`focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`
**And** 聚焦環 MUST 符合 WCAG 2.2 AA 標準的可見性要求
**And** 聚焦環 MUST 與背景有足夠的對比度（至少 3:1）

### Requirement: 公司卡片無障礙性支援
系統 MUST 為公司卡片提供完整的無障礙性支援，包括 ARIA 屬性和鍵盤操作，符合 WCAG 2.2 AA 標準。

#### Scenario: 公司卡片 ARIA 屬性（一般情況）
**Given** 公司卡片渲染
**When** 使用螢幕閱讀器讀取卡片
**Then** 卡片 MUST 包含以下 ARIA 屬性：
- `role="button"`（標識為可點擊元素）
- `aria-label="選擇公司：[公司中文名稱]"`（提供明確的可訪問名稱）
- `tabIndex={0}`（支援鍵盤導航）

#### Scenario: 選中公司卡片的 ARIA 屬性
**Given** 某個公司卡片已被選中
**When** 使用螢幕閱讀器讀取該卡片
**Then** 卡片 MUST 額外包含 `aria-current="true"` 屬性
**And** 螢幕閱讀器 MUST 宣告該公司為當前選中的公司

#### Scenario: 公司卡片鍵盤操作（Enter 鍵）
**Given** 公司卡片獲得鍵盤聚焦
**When** 使用者按下 Enter 鍵
**Then** 系統 MUST 觸發選擇公司的操作（與點擊行為一致）
**And** 卡片 MUST 切換為選中狀態

#### Scenario: 公司卡片鍵盤操作（Space 鍵）
**Given** 公司卡片獲得鍵盤聚焦
**When** 使用者按下 Space 鍵
**Then** 系統 MUST 觸發選擇公司的操作（與點擊行為一致）
**And** 卡片 MUST 切換為選中狀態

#### Scenario: 鍵盤導航順序
**Given** 頁面包含多個公司卡片
**When** 使用者使用 Tab 鍵導航
**Then** 聚焦順序 MUST 從上到下、從左到右（與視覺順序一致）
**And** Shift+Tab MUST 支援反向導航

### Requirement: 響應式佈局適配
系統 MUST 確保公司設定頁面在不同裝置和螢幕尺寸下都有良好的顯示效果和可用性。

#### Scenario: 手機裝置佈局（< 768px）
**Given** 使用者在手機裝置上瀏覽（螢幕寬度 < 768px）
**When** 頁面渲染
**Then** 公司卡片 MUST 以單列顯示（`grid-cols-1`）
**And** 卡片 MUST 佔據全寬（扣除左右邊距）
**And** 觸控區域 MUST 至少為 44x44px（符合移動端可點擊區域最佳實踐）
**And** 文字大小 MUST 保持可讀性，不得過小

#### Scenario: 平板裝置佈局（768px - 1024px）
**Given** 使用者在平板裝置上瀏覽（螢幕寬度 768px - 1024px）
**When** 頁面渲染
**Then** 公司卡片 MUST 以兩列顯示（`md:grid-cols-2`）
**And** 卡片間距 MUST 為 12px（`gap-3`）

#### Scenario: 桌面裝置佈局（> 1024px）
**Given** 使用者在桌面裝置上瀏覽（螢幕寬度 > 1024px）
**When** 頁面渲染
**Then** 公司卡片 MUST 以三列顯示（`lg:grid-cols-3`）
**And** 卡片間距 MUST 為 16px（`gap-4`）
**And** 單個卡片寬度 MUST NOT 超過 400px（保持最佳可讀性）

#### Scenario: PageHeader 按鈕在手機裝置上的顯示
**Given** 使用者在手機裝置上瀏覽（螢幕寬度 < 640px）
**When** PageHeader 渲染
**Then** 「新增公司」按鈕 MUST 保持可見且可點擊
**And** 按鈕 MUST 適當縮小或換行，避免被截斷
**And** 頁面標題 MUST 保持可讀性

## REMOVED Requirements
無移除的需求。

## Implementation Notes

### PageHeader 組件修改（`components/ui/PageHeader.tsx`）
```typescript
// 修改 action 類型定義
type PageHeaderAction =
  | { label: string; href: string }
  | { label: string; onClick: () => void };

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: PageHeaderAction;
}

// 實作類型守衛
function isLinkAction(action: PageHeaderAction): action is { label: string; href: string } {
  return 'href' in action;
}

// 渲染邏輯
{action && (
  isLinkAction(action) ? (
    <Link href={action.href} className="...">
      {action.label}
    </Link>
  ) : (
    <button type="button" onClick={action.onClick} className="...">
      {action.label}
    </button>
  )
)}
```

### CompanySettings 組件修改（`app/[locale]/settings/CompanySettings.tsx`）
1. **移除按鈕**（第 280-285 行）：刪除「我的公司」區塊內的「新增公司」按鈕
2. **暴露 handleCreateCompany**：將函式作為 prop 暴露給父組件
3. **修改卡片 JSX**（第 289-312 行）：
   - 加入視覺層次的資訊顯示
   - 加入 ARIA 屬性（`role`, `aria-label`, `aria-current`, `tabIndex`）
   - 加入鍵盤事件處理器（`onKeyDown`）
   - 優化選中、懸停、聚焦狀態的 CSS 類名
   - 加入統一編號和英文名稱的顯示邏輯

### SettingsPage 修改（`app/[locale]/settings/page.tsx`）
```typescript
// 在 PageHeader 傳遞 action prop
<PageHeader
  title={t('title')}
  description={...}
  action={{
    label: locale === 'zh' ? '新增公司' : 'Add Company',
    onClick: handleCreateCompany  // 從 CompanySettings 提升上來
  }}
/>
```

### API 確認（`app/api/companies/route.ts`）
- 確認 GET `/api/companies` 回傳的 JSON 包含 `tax_id` 欄位
- 如果沒有，需要修改查詢以包含該欄位：
  ```typescript
  const { data, error } = await supabase
    .from('companies')
    .select('company_id, company_name, logo_url, tax_id')  // 加入 tax_id
    .eq(...)
  ```

### 視覺設計參考
- **顏色對比度**：確保所有文字與背景的對比度至少為 4.5:1（WCAG AA 標準）
- **卡片間距**：使用 4px 的倍數（8px, 12px, 16px）
- **過渡效果**：統一使用 `transition-all duration-200` 提供平滑的視覺回饋
- **聚焦環**：使用 Tailwind 的 `ring` 工具類，確保聚焦環清晰可見

## Dependencies
### 必須先完成
1. **API 回傳 `tax_id` 欄位**：如果 `/api/companies` 未包含此欄位，需先修改 API

### 相關組件
- `components/ui/PageHeader.tsx`：需要擴展支援 button 類型的 action
- `app/[locale]/settings/CompanySettings.tsx`：主要修改的組件
- `app/[locale]/settings/page.tsx`：需要整合 PageHeader action

### 無外部依賴
無需安裝新的套件或引入外部庫。

## Testing Requirements
### 功能測試
- [ ] 新增公司按鈕在 PageHeader 中正常顯示和點擊
- [ ] 公司卡片顯示正確的資訊層次（中文名稱、統編、英文名稱）
- [ ] 選中狀態視覺回饋明確
- [ ] 鍵盤導航完全可用（Tab, Enter, Space）

### 無障礙測試
- [ ] 使用 VoiceOver/NVDA 測試螢幕閱讀器支援
- [ ] Lighthouse 無障礙性評分 > 90
- [ ] axe DevTools 無嚴重或中等錯誤

### 視覺測試
- [ ] 所有狀態（一般、懸停、選中、聚焦）視覺效果正確
- [ ] 顏色對比度符合 WCAG AA 標準
- [ ] 響應式佈局在所有裝置上正確顯示

### 跨瀏覽器測試
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

## Rollback Strategy
如果實作後發現問題，可以：
1. 快速回退到原始版本（Git revert）
2. 只保留按鈕位置調整，暫時移除卡片優化
3. 分階段部署，先在測試環境驗證

## Future Enhancements（不在本次範圍內）
- 公司搜尋功能（當公司數量 > 10 時）
- 鍵盤快捷鍵（Cmd/Ctrl + N 新增公司）
- 空狀態插圖（無公司時的引導頁面）
- 公司排序和篩選（按名稱、建立時間等）
- 將卡片組件抽象為獨立組件（`CompanyCard.tsx`）
