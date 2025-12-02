# Tasks: implement-user-onboarding

## Phase 1: 導航優化（快速修復）

### Task 1.1: 新增團隊設定到 Sidebar
- [ ] 修改 `components/Sidebar.tsx`
- [ ] 新增團隊管理連結 `/settings/team`
- [ ] 驗證：Sidebar 顯示團隊管理選項

**檔案**: `components/Sidebar.tsx`

---

## Phase 2: OAuth Callback 重導向邏輯

### Task 2.1: 修改 OAuth Callback 處理邀請碼重導向
- [ ] 讀取現有 `app/auth/callback/route.ts`
- [ ] 新增 redirect 參數檢查
- [ ] 若 redirect 為 `/invite/{code}` 則重導向
- [ ] 驗證：邀請連結登入後導向邀請頁

**檔案**: `app/auth/callback/route.ts`

### Task 2.2: 修改 OAuth Callback 處理 Onboarding 重導向
- [ ] 查詢 company_members 表
- [ ] 無記錄則重導向至 `/onboarding`
- [ ] 有記錄則重導向至 `/dashboard`
- [ ] 驗證：新用戶登入後導向 onboarding

**檔案**: `app/auth/callback/route.ts`
**依賴**: Task 2.1

---

## Phase 3: 邀請頁面優化

### Task 3.1: 修改邀請頁面儲存邀請碼
- [ ] 讀取現有 `app/[locale]/invite/[code]/page.tsx`
- [ ] 未登入時儲存邀請碼到 localStorage
- [ ] 帶 redirect 參數重導向登入
- [ ] 驗證：未登入點擊邀請連結後登入可回到邀請頁

**檔案**: `app/[locale]/invite/[code]/page.tsx`

---

## Phase 4: Onboarding 頁面

### Task 4.1: 建立 Onboarding 歡迎頁
- [ ] 建立 `app/[locale]/onboarding/page.tsx`
- [ ] 實作登入檢查（未登入重導向）
- [ ] 顯示歡迎訊息
- [ ] 顯示兩個選項按鈕
- [ ] 顯示提示文字
- [ ] 驗證：頁面正確渲染

**檔案**: `app/[locale]/onboarding/page.tsx`

### Task 4.2: 建立建立公司頁面
- [ ] 建立 `app/[locale]/onboarding/create-company/page.tsx`
- [ ] 實作表單：公司名稱（必填）、統一編號、電話、地址
- [ ] 呼叫 `/api/companies` POST
- [ ] 成功後重導向 Dashboard
- [ ] 驗證：可成功建立公司

**檔案**: `app/[locale]/onboarding/create-company/page.tsx`
**依賴**: Task 4.1

### Task 4.3: 建立加入公司頁面
- [ ] 建立 `app/[locale]/onboarding/join-company/page.tsx`
- [ ] 實作邀請碼輸入和驗證
- [ ] 顯示公司資訊和角色
- [ ] 呼叫 `/api/invitations/{code}/accept` POST
- [ ] 成功後重導向 Dashboard
- [ ] 驗證：可成功加入公司

**檔案**: `app/[locale]/onboarding/join-company/page.tsx`
**依賴**: Task 4.1

---

## Phase 5: i18n 翻譯

### Task 5.1: 新增中文翻譯
- [ ] 編輯 `messages/zh.json`
- [ ] 新增 onboarding 相關翻譯鍵
- [ ] 驗證：中文頁面正確顯示

**檔案**: `messages/zh.json`
**依賴**: Task 4.1, 4.2, 4.3

### Task 5.2: 新增英文翻譯
- [ ] 編輯 `messages/en.json`
- [ ] 新增 onboarding 相關翻譯鍵
- [ ] 驗證：英文頁面正確顯示

**檔案**: `messages/en.json`
**依賴**: Task 4.1, 4.2, 4.3

---

## Phase 6: 整合測試

### Task 6.1: 測試新用戶流程
- [ ] 新用戶 Google 登入 → 應進入 onboarding
- [ ] 選擇建立公司 → 應成功建立並進入 dashboard
- [ ] 選擇加入公司 → 應成功加入並進入 dashboard

### Task 6.2: 測試邀請連結流程
- [ ] 未登入點擊邀請連結 → 登入後應回到邀請頁
- [ ] 已有公司的用戶接受邀請 → 應加入新公司
- [ ] CompanySelector 應顯示多個公司

### Task 6.3: 測試既有用戶流程
- [ ] 有公司的用戶登入 → 應直接進入 dashboard
- [ ] Sidebar 應顯示團隊管理連結

---

## Parallelizable Work

以下任務可並行執行：
- Task 1.1（Sidebar）可與 Task 2.1, 2.2 並行
- Task 4.2（建立公司）和 Task 4.3（加入公司）可並行
- Task 5.1 和 Task 5.2 可並行

## Critical Path

```
Task 2.1 → Task 2.2 → Task 4.1 → Task 4.2/4.3 → Task 5.1/5.2 → Task 6.x
```
