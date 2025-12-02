# Proposal: implement-user-onboarding

## Why
新用戶登入後無法正確設定公司，導致無法使用系統功能。需要實作 Onboarding 流程引導用戶建立或加入公司。

## Summary
實作新用戶 Onboarding 流程，解決新用戶登入後無法正確設定公司的問題，並優化邀請連結流程防止業務人員誤建公司。

## Problem Statement

### 現有問題
1. **新用戶無法看到團隊設定**：OAuth 登入後只分配角色，沒有建立公司，導致 `fetchCompanies()` 返回空陣列
2. **導航缺失**：Sidebar 沒有團隊設定的直接連結
3. **無 Onboarding 流程**：新用戶登入後直接進入空白 Dashboard
4. **邀請流程中斷**：用戶點擊邀請連結登入後，重導向邏輯會遺失邀請碼

### 影響
- 用戶 `acejou27@gmail.com` 無法存取團隊管理功能
- 業務人員可能誤建新公司而非加入既有公司
- 新用戶體驗不佳

## Proposed Solution

### 第一階段：導航優化
- 在 Sidebar 新增團隊管理連結

### 第二階段：Onboarding 流程
1. **OAuth Callback 重導向邏輯**
   - 檢查 redirect 參數（邀請連結）
   - 檢查用戶是否有公司
   - 無公司則導向 `/onboarding`

2. **Onboarding 歡迎頁**
   - 提供「建立公司」和「我有邀請碼」兩個選項
   - 清楚提示業務人員應選擇「我有邀請碼」

3. **邀請碼流程優化**
   - 未登入時儲存邀請碼到 localStorage
   - 登入後自動導向邀請接受頁

4. **多公司支援**
   - 已有公司的用戶接受邀請後，加入新公司
   - CompanySelector 自動顯示所有公司

## Capabilities Affected

### New Capabilities
- `user-onboarding`: 新用戶引導流程

### Modified Capabilities
- 無（使用現有的邀請系統）

## Out of Scope
- 公司設定精靈（Logo、銀行帳戶等）- 用戶確認只需建立公司即可
- 用戶資料庫驗證修復 - 讓用戶走 Onboarding 流程

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 既有用戶被導向 Onboarding | 高 | 檢查 company_members 記錄，有記錄則跳過 |
| localStorage 被清除導致邀請碼遺失 | 低 | URL redirect 參數作為備用 |
| 多公司切換造成資料混淆 | 中 | CompanySelector 已實作，資料按公司過濾 |

## Success Criteria
1. 新用戶登入後進入 Onboarding 選擇頁
2. 選擇「建立公司」可成功建立並進入 Dashboard
3. 選擇「我有邀請碼」可成功加入公司
4. 邀請連結登入後自動進入邀請接受頁
5. 已有公司的用戶接受邀請後，可切換公司
