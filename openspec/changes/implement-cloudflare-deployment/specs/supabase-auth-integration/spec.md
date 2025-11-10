# Supabase Auth Integration

整合 Supabase Auth 取代 Gmail SMTP，提供專業的認證和 OAuth 登入功能。

---

## ADDED Requirements

### Requirement: Email/密碼認證使用 Supabase Auth

系統 MUST 使用 Supabase Auth 處理 Email 和密碼認證。

#### Scenario: 使用者註冊新帳號

**Given** 使用者在註冊頁面填寫 Email、密碼、姓名
**When** 提交註冊表單
**Then** 系統應該：
- 呼叫 `supabase.auth.signUp({ email, password, options: { emailRedirectTo, data } })`
- 寄送驗證郵件到使用者信箱（透過 Supabase + Resend）
- 顯示「請檢查您的信箱以驗證帳號」訊息
- 在使用者驗證前不允許登入

#### Scenario: 使用者驗證 Email

**Given** 使用者收到驗證郵件
**When** 點擊郵件中的驗證連結
**Then** 系統應該：
- 重定向到 `/auth/callback` 處理驗證
- 呼叫 `supabase.auth.exchangeCodeForSession(code)`
- 建立使用者 session
- 重定向到 `/dashboard`
- 標記使用者的 Email 為已驗證

#### Scenario: 使用者使用 Email/密碼登入

**Given** 使用者已驗證 Email
**When** 在登入頁面輸入 Email 和密碼
**Then** 系統應該：
- 呼叫 `supabase.auth.signInWithPassword({ email, password })`
- 建立使用者 session
- 重定向到 `/dashboard`
- 如果 Email 未驗證，顯示錯誤訊息

#### Scenario: 使用者忘記密碼

**Given** 使用者忘記密碼
**When** 在忘記密碼頁面輸入 Email
**Then** 系統應該：
- 呼叫 `supabase.auth.resetPasswordForEmail({ email })`
- 寄送重設密碼郵件（透過 Supabase + Resend）
- 顯示「請檢查您的信箱以重設密碼」訊息

---

### Requirement: OAuth 社群登入整合

系統 MUST 支援 Google 和 GitHub OAuth 登入。

#### Scenario: 使用者使用 Google 登入

**Given** 使用者在登入頁面點擊「使用 Google 登入」按鈕
**When** 呼叫 `supabase.auth.signInWithOAuth({ provider: 'google' })`
**Then** 系統應該：
- 重定向到 Google OAuth 授權頁面
- 使用者授權後，Google 重定向回 Supabase callback URL
- Supabase 建立或更新使用者帳號
- 重定向到 `/auth/callback` 處理 session
- 最終重定向到 `/dashboard`

#### Scenario: 使用者使用 GitHub 登入

**Given** 使用者在登入頁面點擊「使用 GitHub 登入」按鈕
**When** 呼叫 `supabase.auth.signInWithOAuth({ provider: 'github' })`
**Then** 系統應該：
- 重定向到 GitHub OAuth 授權頁面
- 使用者授權後，GitHub 重定向回 Supabase callback URL
- Supabase 建立或更新使用者帳號
- 重定向到 `/auth/callback` 處理 session
- 最終重定向到 `/dashboard`

#### Scenario: OAuth 失敗處理

**Given** OAuth 流程中發生錯誤（如使用者取消授權）
**When** Supabase 回傳錯誤
**Then** 系統應該：
- 重定向回登入頁面
- 顯示錯誤訊息（如「授權失敗，請重試」）
- 不建立使用者帳號

---

### Requirement: Supabase Email 配置

系統 MUST 正確配置 Supabase Email 設定。

#### Scenario: 設定 Email Provider

**Given** 需要寄送驗證和重設密碼郵件
**When** 在 Supabase Dashboard 配置 Email Provider
**Then** 系統應該：
- 啟用 **Enable Email provider**
- 配置 Email Templates（確認郵件、重設密碼、邀請郵件）
- 設定 SMTP 為 Resend（或 Supabase 內建）
- 確保郵件送達率 > 95%

#### Scenario: 配置 Redirect URLs

**Given** OAuth 和 Email 驗證需要重定向
**When** 在 Supabase Dashboard 設定 Redirect URLs
**Then** 系統應該：
- 加入 `https://quotation-system.pages.dev/auth/callback`
- 加入 `https://quotation-system.pages.dev/*`
- 允許本地開發 URL：`http://localhost:3000/auth/callback`

---

### Requirement: OAuth Provider 配置

系統 MUST 正確配置 Google 和 GitHub OAuth。

#### Scenario: 設定 Google OAuth

**Given** 需要使用 Google 登入
**When** 在 Google Cloud Console 建立 OAuth 2.0 Client
**Then** 系統應該：
- 設定 Authorized redirect URI 為 `https://[project-id].supabase.co/auth/v1/callback`
- 複製 Client ID 和 Client Secret 到 Supabase Dashboard
- 在 Supabase → Authentication → Providers → Google 啟用

#### Scenario: 設定 GitHub OAuth

**Given** 需要使用 GitHub 登入
**When** 在 GitHub Developer Settings 建立 OAuth App
**Then** 系統應該：
- 設定 Authorization callback URL 為 `https://[project-id].supabase.co/auth/v1/callback`
- 複製 Client ID 和 Client Secret 到 Supabase Dashboard
- 在 Supabase → Authentication → Providers → GitHub 啟用

---

## REMOVED Requirements

### Requirement: Gmail SMTP 寄送驗證郵件

~~系統使用 Nodemailer + Gmail SMTP 寄送驗證郵件~~

**理由**：Gmail SMTP 有每日寄送限制（100 封），且非專業郵件服務，容易被標記為垃圾郵件。改用 Supabase Auth + Resend 提供更可靠的郵件服務。

---

## Implementation Notes

### 程式碼修改

1. **註冊頁面**（`app/[locale]/register/page.tsx`）：
   ```typescript
   const { data, error } = await supabase.auth.signUp({
     email,
     password,
     options: {
       emailRedirectTo: `${window.location.origin}/auth/callback`,
       data: { full_name, company_name }
     }
   })
   ```

2. **登入頁面**（`app/[locale]/login/page.tsx`）：
   ```typescript
   const { data, error } = await supabase.auth.signInWithPassword({
     email,
     password
   })
   ```

3. **OAuth 按鈕組件**（`components/OAuthButtons.tsx`）：
   ```typescript
   const handleOAuthLogin = async (provider: 'google' | 'github') => {
     await supabase.auth.signInWithOAuth({
       provider,
       options: {
         redirectTo: `${window.location.origin}/auth/callback`
       }
     })
   }
   ```

4. **Auth Callback**（`app/auth/callback/route.ts`）：
   ```typescript
   export async function GET(request: Request) {
     const code = new URL(request.url).searchParams.get('code')
     if (code) {
       const supabase = await createClient()
       await supabase.auth.exchangeCodeForSession(code)
     }
     return NextResponse.redirect(new URL('/dashboard', request.url))
   }
   ```

### 移除的檔案和程式碼

- 刪除或註解 `lib/services/email.ts` 中的 Nodemailer 程式碼
- 移除環境變數：`GMAIL_USER`、`GMAIL_APP_PASSWORD`

### 驗證方式

- 測試註冊流程，確認收到 Supabase 寄送的驗證郵件
- 測試登入流程
- 測試 Google OAuth 登入
- 測試 GitHub OAuth 登入
- 測試忘記密碼流程
- 確認所有流程無錯誤
