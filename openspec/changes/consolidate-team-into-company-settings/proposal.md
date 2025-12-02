# 整合團隊管理至公司設定

## Why

目前團隊管理頁面（`/settings/team`）與系統設定頁面（`/settings`）是分開的，但邏輯上團隊成員管理應該屬於公司設定的一部分。將團隊成員管理整合到公司設定中可以：
1. 減少導覽層級，使管理更直觀
2. 將相關功能集中在同一頁面
3. 簡化側邊欄選單結構

## What Changes

1. **移除獨立的團隊管理頁面**
   - 刪除 `/settings/team` 路由
   - 從側邊欄移除「團隊管理」選單項目

2. **整合團隊成員管理到公司設定**
   - 在檔案上傳區塊上方新增「團隊成員」區塊
   - 當選擇公司後，顯示該公司的成員列表
   - 保留現有的成員管理功能（檢視、變更角色、移除成員、邀請連結）

3. **重構 CompanySettings 組件**
   - 新增 TeamMemberSection 子區塊
   - 整合 TeamMemberList 和 InviteLinkSection 組件

4. **修復成員資料取得**（新增）
   - 修改 `getCompanyMembers` DAL 函式，join `user_profiles` 表取得成員 email 和名稱
   - 移除前端對 `/api/users/{id}/profile` 的額外呼叫（此 API 不存在）
   - 確保成員列表正確顯示：頭像、名稱、Email、角色、加入日期

## Impact

- 受影響的程式碼：
  - `components/Sidebar.tsx` - 移除團隊管理選單項目
  - `app/[locale]/settings/CompanySettings.tsx` - 新增團隊成員區塊、簡化成員資料獲取
  - `app/[locale]/settings/team/page.tsx` - 刪除此頁面
  - `lib/dal/companies.ts` - 修改 `getCompanyMembers` 函式 join user_profiles

- 使用者體驗：
  - 使用者在公司設定頁面即可管理團隊成員
  - 減少頁面跳轉
  - 成員列表正確顯示 email 和名稱

## 相關規格

- company-settings
