# 🚀 快速開始指南 - 新功能已就緒！

## ✅ 已完成的功能

恭喜！以下功能已經實施並可以使用：

### 1. **資料庫架構** ✅
- ✅ 10個新資料表（roles, permissions, company_settings, contracts, payments等）
- ✅ 5個角色系統（總管理員、公司負責人、業務主管、業務人員、會計）
- ✅ 22個細緻權限
- ✅ 自動化觸發器（付款狀態更新、利潤率計算等）

### 2. **管理員帳號** ✅
- 使用者：Ace周振家
- 角色：Super Admin（總管理員）
- 權限：完整系統權限

### 3. **系統設定頁面** ✅
- 路徑：`/zh/settings` 或 `/en/settings`
- 功能：公司資訊、銀行資訊管理
- 狀態：可使用（Logo上傳功能需要Supabase Storage配置）

### 4. **側邊欄選單** ✅
- ✅ 儀表板
- ✅ 服務/項目（已更名）
- ✅ 客戶
- ✅ 報價單
- ✅ 合約管理（新增）
- ✅ 收款管理（新增）
- ✅ 系統設定（新增）

### 5. **API 端點** ✅
- `/api/company-settings` - GET/POST/PUT（公司設定）
- `/api/rbac/user-profile` - GET/PUT（使用者個人資料）
- 權限中介層已建立

---

## 📝 您還需要做的事情

### **必做任務（5分鐘）**

#### 1. 設定 Supabase Storage RLS 政策

```bash
# 1. 前往 Supabase Dashboard
#    https://supabase.com/dashboard/project/nxlqtnnssfzzpbyfjnby

# 2. 點擊左側選單 "SQL Editor"

# 3. 貼上並執行以下檔案的內容：
#    supabase/storage-rls-policies.sql
```

**這樣檔案上傳（Logo、合約、收據）才能正常運作！**

---

## 🎯 立即測試

### 1. 測試設定頁面

```bash
# 確保開發伺服器正在運行
npm run dev

# 打開瀏覽器
http://localhost:3000/zh/settings
```

您應該看到：
- ✅ 公司設定表單
- ✅ 公司資訊欄位（中英文）
- ✅ 銀行資訊欄位
- ✅ 儲存按鈕

### 2. 測試權限系統

打開瀏覽器開發者工具（F12），執行：

```javascript
// 測試取得使用者個人資料
fetch('/api/rbac/user-profile')
  .then(r => r.json())
  .then(console.log);

// 應該返回：
// {
//   user_id: "2ba3df78-8b23-4b3f-918b-d4f7eea2bfba",
//   full_name: "周振家",
//   display_name: "Ace周振家",
//   ...
// }
```

---

## 📚 建立其他頁面（選用）

系統已經為您準備好了核心架構，您可以基於現有的範例快速建立其他頁面：

### 合約管理頁面

```typescript
// app/[locale]/contracts/page.tsx
// 複製 quotations/page.tsx 並修改為合約相關邏輯
```

### 收款管理頁面

```typescript
// app/[locale]/payments/page.tsx
// 複製 quotations/page.tsx 並修改為收款相關邏輯
```

### 使用者管理頁面（僅管理員）

```typescript
// app/[locale]/users/page.tsx
// 建立使用者列表、角色分配介面
```

---

## 🔧 進階功能實施

### 檔案上傳功能

參考 `IMPLEMENTATION_ROADMAP.md` 中的「檔案上傳範例」：

```typescript
// 上傳 Logo 範例
const uploadLogo = async (file: File) => {
  const supabase = createClientComponentClient();
  const userId = (await supabase.auth.getUser()).data.user?.id;

  const filePath = `${userId}/logo.${file.name.split('.').pop()}`;
  const { data, error } = await supabase.storage
    .from('company-files')
    .upload(filePath, file, { upsert: true });

  if (error) throw error;

  // 取得公開 URL
  const { data: { publicUrl } } = supabase.storage
    .from('company-files')
    .getPublicUrl(filePath);

  // 更新公司設定
  await fetch('/api/company-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logo_url: publicUrl }),
  });
};
```

### 付款排程自動產生

```typescript
// 當建立合約時自動產生付款排程
import { generatePaymentSchedule } from '@/lib/services/contracts';

const contract = await createContract(userId, contractData);
await generatePaymentSchedule(userId, contract.id, customerId, {
  start_date: contractData.start_date,
  end_date: contractData.end_date,
  total_amount: contractData.total_amount,
  currency: contractData.currency,
  payment_terms: 'quarterly', // 或 'semi_annual', 'annual'
});
```

---

## 📖 完整文檔

- **實施藍圖**：`IMPLEMENTATION_ROADMAP.md`（230行詳細規劃）
- **資料庫架構**：`migrations/002_rbac_fixed.sql`（完整SQL）
- **類型定義**：`types/rbac.types.ts`, `types/extended.types.ts`
- **服務函式**：`lib/services/*.ts`

---

## 💡 常見問題

### Q: 如何新增其他使用者並分配角色？

```sql
-- 方法1：直接在資料庫新增（需要Supabase user UUID）
INSERT INTO user_profiles (user_id, full_name, display_name)
VALUES ('USER_UUID_HERE', '張三', '張三');

INSERT INTO user_roles (user_id, role_id)
SELECT 'USER_UUID_HERE', id FROM roles WHERE name = 'salesperson';
```

```typescript
// 方法2：透過API（未來實施）
// POST /api/rbac/assign-role
```

### Q: 如何檢查使用者權限？

```typescript
import { hasPermission } from '@/lib/services/rbac';

const canEdit = await hasPermission(userId, 'products', 'write');
const canSeeCost = await hasPermission(userId, 'products', 'read_cost');
```

### Q: 如何自訂付款到期日？

在 `company_settings` 表中設定 `default_payment_day`（預設為5號）：

```sql
UPDATE company_settings
SET default_payment_day = 10
WHERE user_id = '2ba3df78-8b23-4b3f-918b-d4f7eea2bfba';
```

---

## 🎉 下一步

1. ✅ **測試設定頁面** - 確認可以儲存公司資訊
2. ✅ **設定 Supabase Storage RLS** - 讓檔案上傳功能正常運作
3. **建立合約頁面** - 複製quotations範例並修改
4. **建立收款頁面** - 追蹤已收款/未收款
5. **新增檔案上傳UI** - Logo、合約檔案、收據

---

## 🆘 需要協助？

- 查看 `IMPLEMENTATION_ROADMAP.md` 中的詳細說明
- 參考現有的 `quotations` 頁面作為範例
- 所有服務函式都在 `lib/services/` 中，有完整的 TypeScript 類型

**系統已經準備好了，開始建立您的應用吧！** 🚀
