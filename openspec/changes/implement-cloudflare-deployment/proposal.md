# Proposal: Implement Cloudflare Deployment

## Summary

將報價系統從 Vercel 遷移至 Cloudflare Workers，整合 Cloudflare 免費工具，並改用 Supabase Auth 取代 Gmail SMTP，實現零成本部署且提升全球效能。

## Motivation

### 當前問題

1. **成本問題**：Vercel Pro 每月 $20，對於中小型專案負擔較重
2. **Email 依賴性**：依賴 Gmail SMTP 寄送驗證郵件，存在以下限制：
   - Gmail 每日寄送限制（100 封/日）
   - 需要管理 App Password
   - 非專業郵件服務，可能被標記為垃圾郵件
3. **缺乏全球 CDN 加速**：Vercel 雖有 Edge Network，但 Cloudflare 擁有更多節點（300+）
4. **無快取機制**：每次匯率查詢都需呼叫外部 API，增加延遲和成本

### 期望成果

1. **零成本部署**：Cloudflare Workers 免費方案提供 100K 請求/日
2. **專業認證系統**：使用 Supabase Auth + OAuth（Google、GitHub）
3. **效能提升**：
   - 全球 CDN 加速（300+ 節點）
   - KV 快取匯率資料（減少 API 呼叫）
   - Edge Runtime 低延遲執行
4. **自動化 CI/CD**：GitHub Actions 自動部署，PR 預覽環境
5. **完整監控**：Workers Analytics 追蹤 API 使用、錯誤率、效能

## Scope

### In Scope

- ✅ 建立 GitHub Actions CI/CD 工作流程
- ✅ 配置 Cloudflare Workers 環境變數和 Secrets
- ✅ 移除 Gmail SMTP，改用 Supabase Auth 寄送驗證郵件
- ✅ 整合 OAuth 登入（Google、GitHub）
- ✅ 使用 Resend API 寄送報價單郵件
- ✅ 實作 KV 快取匯率資料
- ✅ 整合 Workers Analytics 追蹤 API 使用
- ✅ 配置 Cron Triggers 自動同步匯率
- ✅ 本地預覽測試（`pnpm run preview:cf`）
- ✅ 部署到 Cloudflare Workers

### Out of Scope

- ❌ 使用 Cloudflare D1（保持使用 Supabase PostgreSQL）
- ❌ 使用 Cloudflare R2（目前無檔案儲存需求）
- ❌ 多區域部署（未來優化項目）
- ❌ 資料庫遷移（保持 Supabase PostgreSQL）

## Dependencies

### 外部服務

- Cloudflare Account（免費方案）
- Supabase 專案（現有）
- Resend Account（免費方案：每月 3000 封）
- Google Cloud Console（OAuth 設定）
- GitHub（OAuth 設定 + Actions）

### 套件依賴

- `@opennextjs/cloudflare`（已安裝）
- `wrangler`（已安裝）
- `@neondatabase/serverless`（已安裝）

## Risks and Mitigations

### 風險 1：OAuth Redirect URI 配置錯誤

**影響**：使用者無法使用 Google/GitHub 登入

**緩解措施**：
- 在測試環境先驗證 Callback URL
- 提供詳細的 OAuth 設定指南
- 確保 Supabase Site URL 和 Redirect URLs 正確

### 風險 2：Email 驗證郵件未送達

**影響**：新使用者無法完成註冊

**緩解措施**：
- 使用 Resend 取代 Supabase 內建 SMTP（更高送達率）
- 測試垃圾郵件資料夾
- 提供 Email 重新寄送功能

### 風險 3：資料庫連線逾時

**影響**：API 回應緩慢或失敗

**緩解措施**：
- 使用 Supabase Pooler URL（而非直連）
- 確認 `@neondatabase/serverless` 正確配置
- 設定適當的 connection timeout

### 風險 4：Workers CPU 時間超過限制

**影響**：複雜運算可能被中斷（免費版 10ms CPU 時間）

**緩解措施**：
- 使用 Queues 處理非同步任務（郵件寄送）
- 優化查詢，減少運算時間
- 監控 Workers Analytics 的 CPU 使用時間

## Success Criteria

1. ✅ GitHub Actions 自動化部署成功運作
2. ✅ 使用者可以使用 Email/密碼註冊並收到驗證郵件
3. ✅ 使用者可以使用 Google/GitHub OAuth 登入
4. ✅ 報價單郵件透過 Resend 成功寄送
5. ✅ KV 快取成功減少匯率 API 呼叫次數
6. ✅ Workers Analytics 正常追蹤 API 使用情況
7. ✅ Cron Trigger 每日自動更新匯率
8. ✅ 本地預覽測試通過（無錯誤）
9. ✅ 生產環境部署成功，所有功能正常運作
10. ✅ Chrome DevTools Console 無錯誤

## Timeline

| 階段 | 預估時間 | 內容 |
|------|---------|------|
| 階段一：基礎設定與 CI/CD | 2-3 小時 | GitHub Actions、環境變數、wrangler.jsonc |
| 階段二：認證系統改造 | 1-2 小時 | Supabase Auth、OAuth、移除 Gmail SMTP |
| 階段三：Cloudflare 工具整合 | 2-3 小時 | KV、Analytics、Cron Triggers |
| 階段四：測試與部署 | 1 天 | 本地測試、部署、驗證 |
| **總計** | **2-3 天** | - |

## Related Changes

- 未來可能新增：Cloudflare R2 儲存客戶簽名和附件
- 未來可能新增：Cloudflare Images 最佳化圖片載入
- 未來可能新增：WAF 規則防 DDoS 攻擊
