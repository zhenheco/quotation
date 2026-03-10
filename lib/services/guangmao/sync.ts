import { SupabaseClient } from '@/lib/db/supabase-client'

/**
 * 根據統一編號自動匹配供應商
 */
export async function matchSupplierByTaxId(
  db: SupabaseClient,
  companyId: string,
  taxId: string,
): Promise<{ id: string; name: Record<string, string> } | null> {
  if (!taxId || taxId === '0000000000') return null

  const { data: supplier, error } = await db
    .from('suppliers')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('tax_id', taxId)
    .maybeSingle()

  if (error) {
    console.error('Match supplier error:', error.message)
    return null
  }

  return supplier
}

/**
 * 進項發票資料格式（從光貿拉取）
 */
interface InputInvoiceData {
  InvoiceNumber: string
  InvoiceDate: string
  SellerIdentifier: string
  SellerName?: string
  SalesAmount: string | number
  TaxAmount: string | number
  TotalAmount: string | number
}

/**
 * 處理從光貿拉取的進項發票 → 匯入系統
 */
export async function processInputInvoice(
  db: SupabaseClient,
  companyId: string,
  inputData: InputInvoiceData,
) {
  const taxId = inputData.SellerIdentifier

  // 1. 重複檢查
  const { data: existing } = await db
    .from('acc_invoices')
    .select('id')
    .eq('company_id', companyId)
    .eq('number', inputData.InvoiceNumber)
    .eq('type', 'INPUT')
    .maybeSingle()

  if (existing) return existing

  // 2. 自動匹配供應商
  const supplier = await matchSupplierByTaxId(db, companyId, taxId)

  // 3. 建立發票記錄
  const { data: invoice, error } = await db
    .from('acc_invoices')
    .insert({
      company_id: companyId,
      number: inputData.InvoiceNumber,
      type: 'INPUT',
      date: inputData.InvoiceDate,
      untaxed_amount: Number(inputData.SalesAmount),
      tax_amount: Number(inputData.TaxAmount),
      total_amount: Number(inputData.TotalAmount),
      counterparty_id: supplier?.id || null,
      counterparty_tax_id: taxId,
      counterparty_name: supplier?.name?.zh || inputData.SellerName || null,
      source: 'GUANGMAO',
      status: supplier ? 'VERIFIED' : 'DRAFT',
      description: supplier ? '光貿自動匯入' : '待分類（供應商未匹配）',
    })
    .select()
    .single()

  if (error) {
    console.error('Process input invoice error:', error.message)
    return null
  }

  return invoice
}
