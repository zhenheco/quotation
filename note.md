# 開發筆記

## 2024-11-30: 修復新增公司時 role_id 為 null 錯誤

### 問題現象
用戶在新增公司存檔時跳出錯誤：
```
failed to add company member: null value in column "role_id" of relation "company_members" violates not-null constraint
```

### 根本原因
`app/api/companies/route.ts:111` 調用 `addCompanyMember` 時未提供 `role_id`：
```typescript
await addCompanyMember(db, company.id, user.id, undefined, true)
```

DAL 層 (`lib/dal/companies.ts:235`) 將 `undefined` 轉為 `null`：
```typescript
role_id: roleId || null,
```

但資料庫約束要求 `role_id NOT NULL`：
```sql
role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT
```

### 解決方案
在 `addCompanyMember` 前先查詢 `company_owner` 角色的 ID：
```typescript
const { data: ownerRole, error: roleError } = await db
  .from('roles')
  .select('id')
  .eq('name', 'company_owner')
  .single()

if (roleError || !ownerRole) {
  await db.from('companies').delete().eq('id', company.id)
  return NextResponse.json(
    { error: 'Company owner role not found' },
    { status: 500 }
  )
}

await addCompanyMember(db, company.id, user.id, ownerRole.id, true)
```

### 經驗教訓
1. **DAL 層與資料庫約束不一致**：DAL 允許 `role_id` 為 null，但資料庫不允許
2. **參考現有實現**：`lib/services/company.ts:183-197` 已有正確做法
3. **錯誤處理需要回滾**：如果角色查詢失敗，應刪除剛建立的公司避免孤立資料

### 相關檔案
- `app/api/companies/route.ts` - API 路由（已修復）
- `lib/dal/companies.ts` - 資料存取層
- `lib/services/company.ts` - 服務層（正確實現參考）
- `migrations/003_multi_company_architecture.sql` - 資料庫約束定義
