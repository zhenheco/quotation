# 實作任務

## 1. 移除團隊管理選單項目
- [ ] 1.1 從 `components/Sidebar.tsx` 移除「團隊管理」選單項目

## 2. 整合團隊成員管理至公司設定
- [ ] 2.1 修改 `app/[locale]/settings/CompanySettings.tsx`，在檔案上傳區塊之前新增團隊成員區塊
- [ ] 2.2 引入 TeamMemberList 組件
- [ ] 2.3 引入 InviteLinkSection 組件
- [ ] 2.4 新增 Tab 切換（成員/邀請連結）
- [ ] 2.5 新增獲取成員資料的 API 呼叫
- [ ] 2.6 新增獲取角色資料的 API 呼叫
- [ ] 2.7 新增當前使用者身份判斷邏輯

## 3. 清理舊頁面
- [ ] 3.1 刪除 `app/[locale]/settings/team/page.tsx`
- [ ] 3.2 如有需要，清理相關的翻譯檔案

## 4. 驗證
- [ ] 4.1 執行 lint 和 typecheck 確保無錯誤
- [ ] 4.2 在瀏覽器中測試公司設定頁面的團隊成員功能
- [ ] 4.3 確認邀請連結功能正常運作
- [ ] 4.4 確認成員角色變更功能正常運作
