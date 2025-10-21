# Zeabur → Supabase 資料遷移計劃

**生成時間**: 2025-10-21
**目標**: 將報價系統資料從 Zeabur PostgreSQL 完全遷移到 Supabase

---

## 📊 現狀分析

### Zeabur PostgreSQL (來源)
**連線**: postgresql://root:***@43.159.54.250:30428/zeabur

**總共 31 個表**，包含：
1. **報價系統的表** (17個) - 需要遷移
2. **塔羅系統的表** (14個) - 不遷移，保留在 Zeabur

### Supabase PostgreSQL (目標)
**連線**: https://nxlqtnnssfzzpbyfjnby.supabase.co
**專案 ID**: nxlqtnnssfzzpbyfjnby

**現有狀態**:
- 有基礎 schema (customers, products, quotations, quotation_items, exchange_rates)
- RLS policies 已啟用
- 需要補充 RBAC 和進階功能

---

## 🗂️ 表分類與遷移優先級

### ✅ 需要遷移的表 (報價系統)

#### 第一優先級 - 核心業務表
```sql
1. customers (客戶資料)
2. products (產品資料)
3. quotations (報價單主表)
4. quotation_items (報價單項目)
5. exchange_rates (匯率資料)
```

#### 第二優先級 - RBAC 系統
```sql
6. roles (角色定義)
7. permissions (權限定義)
8. role_permissions (角色權限對應)
9. user_roles (使用者角色)
10. user_profiles (使用者資料)
```

#### 第三優先級 - 進階功能
```sql
11. companies (公司資料)
12. company_members (公司成員)
13. company_settings (公司設定) - 可能與 companies 合併
14. customer_contracts (客戶合約)
15. payments (收款記錄)
16. payment_schedules (付款排程)
17. audit_logs (審計日誌)
```

#### 第四優先級 - 擴充功能
```sql
18. quotation_shares (分享功能)
19. quotation_versions (版本控制)
```

### ❌ 不遷移的表 (塔羅系統)
```sql
- Card, Deck, Draw, DrawCard, JournalEntry
- DailyUsage, Payment (塔羅的), PointTransaction, Spread
- Subscription, SystemConfig, User (塔羅的)
```

**處理方式**: 保留在 Zeabur 資料庫，由塔羅系統繼續使用

---

## 🔄 遷移策略

### 策略 A: 完整遷移 (推薦)
**適用**: 希望完全使用 Supabase 管理報價系統

**步驟**:
1. 在 Supabase 建立完整 schema
2. 遷移所有報價系統的表和資料
3. 更新程式碼移除 Zeabur 連線
4. 測試並驗證
5. Zeabur 僅保留塔羅系統表

**優點**:
- ✅ 統一管理，簡化架構
- ✅ 使用 Supabase 的 RLS 和 Auth
- ✅ 有 MCP server 支援
- ✅ 備份和監控更方便

**缺點**:
- ⚠️ 需要修改較多程式碼
- ⚠️ 遷移過程需要謹慎

### 策略 B: 分階段遷移
**適用**: 風險較低的漸進式遷移

**階段 1**: 遷移核心業務表
- customers, products, quotations, quotation_items, exchange_rates

**階段 2**: 遷移 RBAC 系統
- roles, permissions, role_permissions, user_roles, user_profiles

**階段 3**: 遷移進階功能
- companies, contracts, payments 等

**階段 4**: 遷移擴充功能
- quotation_shares, quotation_versions

---

## 📋 詳細執行計劃

### Phase 1: 準備階段

#### 1.1 Schema 分析
- [x] 列出所有 Zeabur 表
- [ ] 比對 Supabase 現有 schema
- [ ] 識別差異和衝突
- [ ] 規劃欄位對應

#### 1.2 Schema 同步
- [ ] 在 Supabase 建立缺少的表
- [ ] 建立必要的 Foreign Keys
- [ ] 建立必要的 Indexes
- [ ] 設定 RLS Policies
- [ ] 設定 Triggers (updated_at, etc.)

#### 1.3 備份準備
- [ ] 備份 Zeabur 完整資料
- [ ] 備份 Supabase 現有資料
- [ ] 準備回滾方案

### Phase 2: 資料遷移

#### 2.1 核心業務表遷移 (優先)
```sql
-- 遷移順序 (考慮外鍵依賴)
1. customers (無依賴)
2. products (無依賴)
3. quotations (依賴 customers)
4. quotation_items (依賴 quotations, products)
5. exchange_rates (無依賴)
```

**方法**:
```bash
# 使用 pg_dump 和 pg_restore
pg_dump -h 43.159.54.250 -p 30428 -U root -d zeabur \
  -t customers -t products -t quotations -t quotation_items -t exchange_rates \
  --data-only --column-inserts > core_data.sql

# 或使用自訂腳本
npx tsx scripts/migrate-core-tables.ts
```

#### 2.2 RBAC 系統遷移
```sql
-- 遷移順序
1. roles (無依賴)
2. permissions (無依賴)
3. role_permissions (依賴 roles, permissions)
4. user_profiles (無依賴)
5. user_roles (依賴 roles, user_profiles)
```

#### 2.3 進階功能遷移
```sql
-- 遷移順序
1. companies (無依賴)
2. company_members (依賴 companies, user_profiles)
3. customer_contracts (依賴 customers)
4. payments (依賴 quotations, contracts, customers)
5. payment_schedules (依賴 contracts, payments)
6. audit_logs (無依賴)
```

#### 2.4 擴充功能遷移
```sql
1. quotation_shares (依賴 quotations)
2. quotation_versions (依賴 quotations)
```

### Phase 3: 程式碼更新

#### 3.1 資料庫連線更新
```typescript
// 移除
import { query } from '@/lib/db/zeabur'

// 改為
import { createClient } from '@/lib/supabase/server'
```

#### 3.2 CRUD 函式更新
```typescript
// 舊 (Zeabur)
export async function getCustomers(userId: string) {
  const result = await query(
    'SELECT * FROM customers WHERE user_id = $1',
    [userId]
  )
  return result.rows
}

// 新 (Supabase)
export async function getCustomers(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return data
}
```

#### 3.3 環境變數清理
```bash
# .env.local
# 移除
ZEABUR_POSTGRES_URL=postgresql://...

# 保留
NEXT_PUBLIC_SUPABASE_URL=https://nxlqtnnssfzzpbyfjnby.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Phase 4: 測試與驗證

#### 4.1 資料完整性測試
- [ ] 比對記錄數量
- [ ] 驗證外鍵關聯
- [ ] 檢查資料一致性
- [ ] 測試查詢效能

#### 4.2 功能測試
- [ ] CRUD 操作測試
- [ ] RLS policies 測試
- [ ] 認證流程測試
- [ ] RBAC 權限測試
- [ ] 報價單生成測試
- [ ] PDF 匯出測試

#### 4.3 效能測試
- [ ] 查詢效能基準
- [ ] 並發測試
- [ ] 索引效能驗證

### Phase 5: 上線與清理

#### 5.1 生產環境部署
- [ ] 更新環境變數
- [ ] 部署新程式碼
- [ ] 監控錯誤日誌
- [ ] 準備緊急回滾方案

#### 5.2 Zeabur 清理
- [ ] 確認塔羅系統正常運作
- [ ] 刪除報價系統的表 (可選)
- [ ] 保留備份至少 30 天

---

## ⚠️ 風險與注意事項

### 資料遷移風險
1. **資料遺失**: 必須完整備份
2. **停機時間**: 建議選擇低峰時段
3. **資料不一致**: 遷移期間暫停寫入操作

### 緩解措施
- ✅ 完整備份 Zeabur 和 Supabase
- ✅ 使用交易確保資料完整性
- ✅ 分階段遷移降低風險
- ✅ 準備回滾方案
- ✅ 充分測試後再上線

### user_id 處理
**重要**: Zeabur 的 `user_id` 必須與 Supabase `auth.users(id)` 對應

**檢查方法**:
```sql
-- Zeabur: 列出所有不同的 user_id
SELECT DISTINCT user_id FROM customers;

-- Supabase: 列出所有認證用戶
SELECT id, email FROM auth.users;
```

**如果不匹配**:
- 選項 A: 更新 Zeabur 的 user_id
- 選項 B: 建立 user_id 對應表
- 選項 C: 在 Supabase 建立對應的 auth.users

---

## 🛠️ 遷移腳本

### 腳本 1: Schema 同步
```bash
npx tsx scripts/migrate-schema-to-supabase.ts
```

**功能**:
- 分析 Zeabur schema
- 在 Supabase 建立缺少的表
- 建立 Foreign Keys 和 Indexes
- 設定 RLS Policies

### 腳本 2: 資料遷移
```bash
npx tsx scripts/migrate-data-to-supabase.ts --tables=core
npx tsx scripts/migrate-data-to-supabase.ts --tables=rbac
npx tsx scripts/migrate-data-to-supabase.ts --tables=advanced
```

**功能**:
- 分批遷移表資料
- 顯示進度條
- 驗證資料完整性
- 記錄遷移日誌

### 腳本 3: 驗證測試
```bash
npx tsx scripts/verify-migration.ts
```

**功能**:
- 比對記錄數量
- 驗證外鍵關聯
- 測試基本查詢
- 生成驗證報告

---

## 📅 時程規劃

### 第一天: 準備與 Schema 同步
- 備份資料
- Schema 分析
- 建立 Supabase schema
- 設定 RLS policies

### 第二天: 核心資料遷移
- 遷移 customers, products, quotations
- 驗證資料完整性
- 測試基本功能

### 第三天: RBAC 與進階功能
- 遷移 RBAC 系統
- 遷移 companies, contracts, payments
- 功能測試

### 第四天: 程式碼更新與測試
- 更新所有 CRUD 函式
- 整合測試
- 效能測試

### 第五天: 上線與監控
- 生產環境部署
- 監控與調整
- 文檔更新

---

## ✅ 檢查清單

### 遷移前
- [ ] 完整備份 Zeabur 資料
- [ ] 完整備份 Supabase 資料
- [ ] Schema 同步完成
- [ ] RLS policies 設定完成
- [ ] 遷移腳本測試完成
- [ ] 回滾方案準備完成

### 遷移中
- [ ] 暫停生產環境寫入
- [ ] 執行資料遷移
- [ ] 驗證資料完整性
- [ ] 測試基本功能
- [ ] 程式碼更新部署

### 遷移後
- [ ] 所有功能測試通過
- [ ] 效能測試通過
- [ ] 監控無異常錯誤
- [ ] 文檔更新完成
- [ ] 團隊培訓完成

---

## 🎯 成功標準

1. ✅ 所有報價系統表成功遷移到 Supabase
2. ✅ 資料完整性 100% (記錄數量一致)
3. ✅ 所有功能正常運作
4. ✅ RLS policies 正確保護資料
5. ✅ 查詢效能符合預期
6. ✅ 塔羅系統繼續正常運作在 Zeabur

---

**計劃制定**: Claude Code
**最後更新**: 2025-10-21
**預計完成**: 5 個工作天
