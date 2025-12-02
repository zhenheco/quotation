# Design: implement-user-onboarding

## Architecture Overview

### 用戶登入流程決策樹

```
用戶點擊 Google 登入
        ↓
    OAuth Callback
        ↓
┌─ 檢查 redirect 參數 ─┐
│                      │
│  有 /invite/{code}   │ ─→ 重導向至邀請接受頁
│                      │
└──────────────────────┘
        ↓ 無
┌─ 查詢 company_members ─┐
│                        │
│  有記錄（有公司）        │ ─→ 重導向至 Dashboard
│                        │
└────────────────────────┘
        ↓ 無記錄
    重導向至 /onboarding
```

### 頁面結構

```
app/[locale]/
├── onboarding/
│   ├── page.tsx              # 歡迎頁（選擇建立/加入）
│   ├── create-company/
│   │   └── page.tsx          # 建立公司表單
│   └── join-company/
│       └── page.tsx          # 輸入邀請碼
├── invite/
│   └── [code]/
│       └── page.tsx          # 邀請接受頁（已存在，需修改）
└── auth/
    └── callback/
        └── route.ts          # OAuth 回調（需修改）
```

## Component Design

### OnboardingWelcome

**位置**: `app/[locale]/onboarding/page.tsx`

**職責**:
- 顯示歡迎訊息
- 提供兩個選項：建立公司 / 我有邀請碼
- 保護頁面：需登入才能存取

**UI 設計**:
```
┌─────────────────────────────────────────────┐
│         歡迎使用報價系統                      │
│      讓我們開始設定您的工作環境                │
│                                             │
│  ┌─────────────┐    ┌─────────────┐        │
│  │ 🏢 建立新公司 │    │ 📨 我有邀請碼 │        │
│  │             │    │             │        │
│  │ 我是公司負責人│    │ 我被邀請加入 │        │
│  └─────────────┘    └─────────────┘        │
│                                             │
│  💡 如果收到同事的邀請連結，請選擇「我有邀請碼」  │
└─────────────────────────────────────────────┘
```

### CreateCompanyForm

**位置**: `app/[locale]/onboarding/create-company/page.tsx`

**欄位**:
- 公司名稱（中文/英文）- 必填
- 統一編號 - 選填
- 聯絡電話 - 選填
- 公司地址 - 選填

**行為**:
1. 驗證表單
2. 呼叫 `/api/companies` POST 建立公司
3. 自動建立 company_members（role = company_owner）
4. 重導向至 Dashboard

### JoinCompanyForm

**位置**: `app/[locale]/onboarding/join-company/page.tsx`

**欄位**:
- 邀請碼輸入框

**行為**:
1. 輸入邀請碼
2. 呼叫 `/api/invitations/{code}` GET 驗證
3. 顯示公司資訊和角色
4. 確認後呼叫 `/api/invitations/{code}/accept` POST
5. 重導向至 Dashboard

## API Changes

### OAuth Callback (`/app/auth/callback/route.ts`)

**新增邏輯**:

```typescript
// 1. 保留 redirect 參數處理
const redirectTo = requestUrl.searchParams.get('redirect')
if (redirectTo?.startsWith('/invite/')) {
  return NextResponse.redirect(new URL(`/${locale}${redirectTo}`, requestUrl.origin))
}

// 2. 檢查用戶是否有公司
const { data: membership } = await supabase
  .from('company_members')
  .select('company_id')
  .eq('user_id', user.id)
  .limit(1)
  .single()

// 3. 無公司則導向 onboarding
if (!membership) {
  return NextResponse.redirect(new URL(`/${locale}/onboarding`, requestUrl.origin))
}
```

### Invite Page (`/app/[locale]/invite/[code]/page.tsx`)

**新增邏輯**:

```typescript
// 未登入時儲存邀請碼
useEffect(() => {
  if (!session && inviteCode) {
    localStorage.setItem('pendingInviteCode', inviteCode)
    router.push(`/${locale}/login?redirect=/invite/${inviteCode}`)
  }
}, [session, inviteCode, locale, router])
```

## Data Flow

### 新用戶建立公司

```
Onboarding Page → Create Company Form → POST /api/companies
                                              ↓
                                        建立 company 記錄
                                              ↓
                                        建立 company_members 記錄
                                        (user_id, company_id, role=owner)
                                              ↓
                                        重導向 Dashboard
```

### 新用戶加入公司（邀請碼）

```
Onboarding Page → Join Company Form → GET /api/invitations/{code}
                                              ↓
                                        驗證邀請碼有效性
                                              ↓
                                        顯示公司資訊 + 角色
                                              ↓
                                        POST /api/invitations/{code}/accept
                                              ↓
                                        建立 company_members 記錄
                                              ↓
                                        重導向 Dashboard
```

### 邀請連結流程（未登入）

```
用戶點擊 /invite/{code}
        ↓
    未登入檢測
        ↓
儲存 localStorage.pendingInviteCode
        ↓
重導向 /login?redirect=/invite/{code}
        ↓
    Google 登入
        ↓
  OAuth Callback
        ↓
讀取 redirect 參數
        ↓
重導向 /invite/{code}
        ↓
  接受邀請流程
```

## Security Considerations

1. **Onboarding 頁面保護**
   - 使用 middleware 或 session 檢查
   - 未登入用戶重導向至登入頁

2. **防止重複建立公司**
   - 建立公司時檢查用戶是否已有公司
   - 可選：允許建立多個公司（目前設計支援）

3. **邀請碼安全**
   - 使用現有的邀請碼驗證邏輯
   - 過期檢查、使用次數限制

4. **LocalStorage 風險**
   - 邀請碼為非敏感資訊（只是識別碼）
   - 成功接受後清除 localStorage
