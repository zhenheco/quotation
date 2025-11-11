# QuotationForm 組件類型修正

## MODIFIED Requirements

### Requirement: PaymentTerm 類型必須正確導入

`app/[locale]/quotations/QuotationForm.tsx` 第 21 行的 `PaymentTerm` 類型 MUST 正確定義和導入。

#### Scenario: 從資料庫類型導入 PaymentTerm

**Given** `types/database.types.ts` 定義了完整的資料庫 schema
**When** 組件需要使用 `payment_terms` 表的類型
**Then** 導入:
```typescript
import type { Database } from '@/types/database.types'

type PaymentTerm = Database['public']['Tables']['payment_terms']['Row']
```
**And** 確保 `Database['public']['Tables']['payment_terms']` 存在
**And** 確保 `Row` 屬性有定義

#### Scenario: 驗證 database.types.ts 包含 payment_terms 表

**Given** TypeScript 報告 `Property 'Row' does not exist on type '{}'.`
**When** 檢查 `types/database.types.ts`
**Then** 確認 `payment_terms` 表定義存在:
```typescript
export interface Database {
  public: {
    Tables: {
      payment_terms: {
        Row: {
          id: string
          quotation_id: string
          stage: number
          percentage: number
          amount: number
          description: { zh: string; en: string } | null
          due_days: number | null
          created_at: string
        }
        Insert: { /* ... */ }
        Update: { /* ... */ }
      }
      // ... 其他表
    }
  }
}
```
**And** 若缺失，執行 `supabase gen types typescript` 重新生成

## ADDED Requirements

### Requirement: 組件狀態類型必須明確定義

QuotationForm 使用的所有狀態和 props MUST 有明確的類型定義，SHALL 確保類型安全。

#### Scenario: PaymentTermsEditor 接收正確的 props 類型

**Given** QuotationForm 使用 `PaymentTermsEditor` 組件
**And** 傳遞以下 props:
- `terms: Partial<PaymentTerm>[]`
- `totalAmount: number`
- `currency: string`
- `locale: 'zh' | 'en'`
- `onChange: (terms: Partial<PaymentTerm>[]) => void`

**When** TypeScript 檢查類型
**Then** `PaymentTermsEditor` 的 props 介面必須匹配
**And** `PaymentTerm` 類型正確定義
**And** 無類型錯誤

#### Scenario: paymentTerms 狀態類型正確

**Given** 組件定義 `paymentTerms` 狀態
**When** 使用 `useState<Partial<PaymentTerm>[]>([])`
**Then** 狀態類型為 `Partial<PaymentTerm>[]`
**And** `setPaymentTerms` 接受此類型
**And** 傳遞給 API 時類型正確

## 實作注意事項

1. **類型生成**:
   - 使用 Supabase CLI 生成類型: `supabase gen types typescript --project-id <id> > types/database.types.ts`
   - 確保包含所有表的定義
   - 定期同步資料庫 schema 變更

2. **型別導入策略**:
   - 使用 `type` 關鍵字導入類型 (Tree-shaking 友善)
   - 集中從 `database.types.ts` 導入
   - 避免重複定義相同類型

3. **Partial 類型使用**:
   - `Partial<PaymentTerm>[]` 允許付款條款欄位可選
   - 建立時可能只有部分欄位
   - API 會補全缺失欄位

4. **驗證檢查**:
   - 組件內驗證 `paymentTerms` 格式
   - 確保百分比總和為 100%
   - 確保金額總和等於報價單總額
