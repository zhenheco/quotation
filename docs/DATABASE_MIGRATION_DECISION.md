# 資料庫架構決策指南

## 🎯 當前狀況

**問題**：代碼與數據存儲位置不一致
- 代碼：使用 Supabase 客戶端查詢業務表
- 數據：實際存在於 Zeabur PostgreSQL
- 結果：`Error fetching products: {}` （找不到數據）

---

## 📊 兩個解決方案對比

| 項目 | 方案 A: Supabase | 方案 B: Zeabur PostgreSQL |
|------|------------------|---------------------------|
| **代碼改動** | ✅ 零改動 | ❌ 20+ 文件需重寫 |
| **工作量** | ✅ 5 分鐘 | ❌ 4-6 小時 |
| **數據遷移** | ⚠️ 需要（如有重要數據） | ✅ 不需要 |
| **RLS 保護** | ✅ 自動 | ❌ 需手動實現 |
| **成本** | ⚠️ Supabase 免費額度 | ✅ Zeabur 已付費 |
| **可擴展性** | ✅ Supabase 自動擴展 | ⚠️ 需手動管理 |
| **控制程度** | ⚠️ 受限於 Supabase | ✅ 完全控制 |

---

## ✅ 推薦：方案 A（Supabase）

### 適合情況
- ✓ Zeabur 上沒有重要數據（或數據量不大）
- ✓ 想快速解決問題
- ✓ 專注於業務功能開發
- ✓ 團隊規模小，不想管理資料庫

### 執行步驟

#### 1. 確認 Zeabur 數據狀態

連接到 Zeabur PostgreSQL 檢查：
```bash
# 如果有 ZEABUR_POSTGRES_URL，執行：
PGPASSWORD='your-password' psql 'postgresql://user@host:port/database' -c "
SELECT
  (SELECT COUNT(*) FROM customers) as customers,
  (SELECT COUNT(*) FROM products) as products,
  (SELECT COUNT(*) FROM quotations) as quotations;
"
```

#### 2A. 如果沒有重要數據

直接使用 Supabase：
```bash
# 重啟服務
rm -rf .next
npm run dev

# 訪問瀏覽器手動創建數據
open http://localhost:3000/zh/customers/new
```

#### 2B. 如果有重要數據

遷移數據到 Supabase：
```bash
# 1. 從 Zeabur 導出數據
pg_dump "postgresql://..." --data-only --table=customers --table=products --table=quotations --table=quotation_items > zeabur_data.sql

# 2. 導入到 Supabase
psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f zeabur_data.sql
```

#### 3. 更新環境變數配置

`.env.local`:
```bash
# Supabase (Authentication + Business Data) ✅ 主要資料庫
NEXT_PUBLIC_SUPABASE_URL=https://nxlqtnnssfzzpbyfjnby.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Zeabur PostgreSQL（僅匯率數據，可選）
# ZEABUR_POSTGRES_URL=postgresql://...  # 如不需要可保持註解
```

#### 4. 驗證

```bash
# 重啟
npm run dev

# 測試所有頁面
curl http://localhost:3000/api/health
open http://localhost:3000/zh/customers
open http://localhost:3000/zh/products
open http://localhost:3000/zh/quotations
```

---

## 🔧 方案 B（Zeabur PostgreSQL）

### 適合情況
- ✓ Zeabur 上有大量重要數據
- ✓ 需要完全控制資料庫
- ✓ 團隊有資深後端工程師
- ✓ 有時間進行大規模重構（4-6 小時）

### 執行步驟

#### 1. 啟用 Zeabur 連接

`.env.local`:
```bash
# 取消註解並填入正確的連接資訊
ZEABUR_POSTGRES_URL=postgresql://root:YOUR_PASSWORD@YOUR_HOST:PORT/zeabur
```

#### 2. 在 Zeabur 執行 Schema Migration

確保 Zeabur PostgreSQL 有正確的表結構：
```bash
# 連接到 Zeabur
PGPASSWORD='your-password' psql "postgresql://..." -f supabase-migrations/000_drop_and_recreate.sql
```

**注意**：需要先移除 SQL 中的 Supabase 專屬部分：
- 移除 `REFERENCES auth.users(id)` （改為直接使用 UUID）
- 移除所有 RLS 策略（改為應用層實現）

#### 3. 創建 Zeabur 專用的服務層

`lib/services/database.ts`:
```typescript
import { getZeaburPool } from '@/lib/db/zeabur'

export async function getCustomers(userId: string) {
  const pool = getZeaburPool()
  const result = await pool.query(
    'SELECT * FROM customers WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  )
  return result.rows
}

export async function getProducts(userId: string) {
  const pool = getZeaburPool()
  const result = await pool.query(
    'SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  )
  return result.rows
}

// ... 更多 CRUD 函數
```

#### 4. 重寫所有頁面

**需要修改的文件清單**（估計 20+ 個）：
```
✏️ app/[locale]/customers/page.tsx
✏️ app/[locale]/customers/new/page.tsx
✏️ app/[locale]/customers/[id]/page.tsx
✏️ app/[locale]/products/page.tsx
✏️ app/[locale]/products/new/page.tsx
✏️ app/[locale]/products/[id]/page.tsx
✏️ app/[locale]/quotations/page.tsx
✏️ app/[locale]/quotations/new/page.tsx
✏️ app/[locale]/quotations/[id]/page.tsx
✏️ app/api/customers/route.ts
✏️ app/api/products/route.ts
✏️ app/api/quotations/route.ts
... 還有很多
```

**範例修改**（`app/[locale]/products/page.tsx`）：

```typescript
// Before (Supabase 客戶端):
const { data: products, error } = await supabase
  .from('products')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })

// After (pg 客戶端):
import { getProducts } from '@/lib/services/database'

const products = await getProducts(user.id)
```

#### 5. 實現用戶隔離邏輯

由於沒有 RLS，需要在每個查詢中手動加 `user_id` 過濾：
```typescript
// 每次查詢都必須加上 WHERE user_id = $1
// 否則會有安全漏洞！
```

---

## 🎯 我的建議

### 如果您的情況是：

**A. Zeabur 上沒有重要數據（或數據很少）**
→ **選方案 A**，5 分鐘解決，立即開始開發業務功能

**B. Zeabur 上有少量數據（< 1000 筆）**
→ **選方案 A**，花 30 分鐘遷移數據，然後專注業務

**C. Zeabur 上有大量數據（> 1000 筆）且非常重要**
→ 考慮方案 B，但需要 4-6 小時重構時間

**D. 預算有限，不想用 Supabase**
→ 選方案 B，但這是長期投資

---

## 📞 下一步

請告訴我：

1. **Zeabur PostgreSQL 上有多少重要數據？**
   - [ ] 沒有或很少（< 100 筆）
   - [ ] 中等（100-1000 筆）
   - [ ] 大量（> 1000 筆）

2. **您更看重什麼？**
   - [ ] 快速解決問題，盡快繼續開發
   - [ ] 完全控制資料庫，長期穩定

3. **您的 Zeabur PostgreSQL 連接資訊是？**
   ```
   ZEABUR_POSTGRES_URL=postgresql://...
   ```
   （如果選方案 A，可以不提供；如果選方案 B，必須提供）

---

**建議**：如果不確定，先選**方案 A**快速驗證系統功能，之後有需要再遷移到 Zeabur。

