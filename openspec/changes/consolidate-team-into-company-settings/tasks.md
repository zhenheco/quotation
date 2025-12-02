# 實作任務

## 1. 修復成員資料取得（優先）
- [ ] 1.1 修改 `lib/dal/companies.ts` 的 `getCompanyMembers` 函式，join `user_profiles` 表
- [ ] 1.2 更新 `CompanyMember` 介面，加入 `user_profile` 欄位
- [ ] 1.3 移除 `CompanySettings.tsx` 中對 `/api/users/{id}/profile` 的額外呼叫
- [ ] 1.4 確認 API 回傳資料包含 email、full_name、display_name、avatar_url

## 2. 移除團隊管理選單項目
- [ ] 2.1 從 `components/Sidebar.tsx` 移除「團隊管理」選單項目

## 3. 整合團隊成員管理至公司設定
- [x] 3.1 修改 `app/[locale]/settings/CompanySettings.tsx`，在檔案上傳區塊之前新增團隊成員區塊
- [x] 3.2 引入 TeamMemberList 組件
- [x] 3.3 引入 InviteLinkSection 組件
- [x] 3.4 新增 Tab 切換（成員/邀請連結）
- [x] 3.5 新增獲取成員資料的 API 呼叫
- [x] 3.6 新增獲取角色資料的 API 呼叫
- [x] 3.7 新增當前使用者身份判斷邏輯

## 4. 清理舊頁面
- [ ] 4.1 刪除 `app/[locale]/settings/team/page.tsx`（如存在）
- [ ] 4.2 如有需要，清理相關的翻譯檔案

## 5. 驗證
- [ ] 5.1 執行 lint 和 typecheck 確保無錯誤
- [ ] 5.2 在瀏覽器中測試公司設定頁面的團隊成員功能
- [ ] 5.3 確認成員列表正確顯示：頭像、名稱、Email、角色、加入日期
- [ ] 5.4 確認邀請連結功能正常運作
- [ ] 5.5 確認成員角色變更功能正常運作
