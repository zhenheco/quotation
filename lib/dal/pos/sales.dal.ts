/**
 * POS 銷售交易資料存取層 (DAL)
 * Account-system → quotation-system 整合
 */

import { SupabaseClient } from '@/lib/db/supabase-client'

// ============================================
// 類型定義
// ============================================

export type SalesStatus = 'PENDING' | 'COMPLETED' | 'VOIDED' | 'REFUNDED'
export type DiscountType = 'MEMBER_LEVEL' | 'PROMOTION' | 'MANUAL'
export type PaymentMethodType = 'CASH' | 'CARD' | 'TRANSFER' | 'BALANCE' | 'OTHER'

export interface SalesTransaction {
  id: string
  tenant_id: string
  branch_id: string
  transaction_no: string
  transaction_date: string
  transaction_time: string
  member_id: string | null
  member_name: string | null
  subtotal: number
  discount_amount: number
  total_amount: number
  tax_amount: number
  discount_type: DiscountType | null
  discount_reason: string | null
  status: SalesStatus
  voided_at: string | null
  void_reason: string | null
  voided_by: string | null
  invoice_id: string | null
  journal_entry_id: string | null
  settlement_id: string | null
  created_at: string
  created_by: string | null
  updated_at: string
}

export interface TransactionItem {
  id: string
  transaction_id: string
  service_id: string | null
  service_package_id: string | null
  item_name: string
  quantity: number
  unit_price: number
  amount: number
  staff_id: string | null
  staff_name: string | null
  created_at: string
}

export interface TransactionPayment {
  id: string
  transaction_id: string
  payment_method: PaymentMethodType
  amount: number
  received_amount: number | null
  change_amount: number | null
  member_balance_used: number | null
  created_at: string
}

export interface TransactionCommission {
  id: string
  transaction_id: string
  staff_id: string
  service_amount: number
  commission_amount: number
  commission_rate: number | null
  rule_type: string | null
  rule_config: Record<string, unknown> | null
  is_settled: boolean
  settled_at: string | null
  created_at: string
}

export interface SalesTransactionFull extends SalesTransaction {
  items: TransactionItem[]
  payments: TransactionPayment[]
  commissions: TransactionCommission[]
}

export interface CreateSalesTransactionInput {
  tenant_id: string
  branch_id: string
  member_id?: string
  member_name?: string
  items: {
    service_id?: string
    service_package_id?: string
    item_name: string
    quantity: number
    unit_price: number
    staff_id?: string
    staff_name?: string
  }[]
  payments: {
    payment_method: PaymentMethodType
    amount: number
    received_amount?: number
    member_balance_used?: number
  }[]
  discount_type?: DiscountType
  discount_amount?: number
  discount_reason?: string
  created_by?: string
}

export interface SalesQueryOptions {
  tenantId: string
  branchId?: string
  status?: SalesStatus
  startDate?: string
  endDate?: string
  memberId?: string
  limit?: number
  offset?: number
}

export interface SalesSummary {
  totalSales: number
  transactionCount: number
  averageTicket: number
  cashAmount: number
  cardAmount: number
  balanceUsed: number
  voidedCount: number
  refundedAmount: number
}

// ============================================
// 輔助函數
// ============================================

/**
 * 產生交易編號
 */
async function generateTransactionNo(
  db: SupabaseClient,
  tenantId: string,
  branchId: string
): Promise<string> {
  const today = new Date()
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`

  // 取得分店代碼
  const { data: branch } = await db
    .from('branches')
    .select('code')
    .eq('id', branchId)
    .single()

  const branchCode = branch?.code || 'XX'
  const prefix = `${branchCode}${dateStr}`

  // 取得當日最大編號
  const { data, error } = await db
    .from('sales_transactions')
    .select('transaction_no')
    .eq('tenant_id', tenantId)
    .like('transaction_no', `${prefix}%`)
    .order('transaction_no', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(`產生交易編號失敗: ${error.message}`)
  }

  let nextSeq = 1
  if (data && data.length > 0) {
    const lastNo = data[0].transaction_no
    const lastSeq = parseInt(lastNo.slice(-4), 10)
    nextSeq = lastSeq + 1
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`
}

// ============================================
// 查詢函數
// ============================================

/**
 * 取得銷售交易列表
 */
export async function getSalesTransactions(
  db: SupabaseClient,
  options: SalesQueryOptions
): Promise<SalesTransaction[]> {
  const {
    tenantId,
    branchId,
    status,
    startDate,
    endDate,
    memberId,
    limit = 50,
    offset = 0,
  } = options

  let query = db
    .from('sales_transactions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('transaction_time', { ascending: false })
    .range(offset, offset + limit - 1)

  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (startDate) {
    query = query.gte('transaction_date', startDate)
  }

  if (endDate) {
    query = query.lte('transaction_date', endDate)
  }

  if (memberId) {
    query = query.eq('member_id', memberId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`取得銷售交易失敗: ${error.message}`)
  }

  return data || []
}

/**
 * 根據 ID 取得完整交易資料
 */
export async function getSalesTransactionById(
  db: SupabaseClient,
  transactionId: string
): Promise<SalesTransactionFull | null> {
  const { data: transaction, error: txError } = await db
    .from('sales_transactions')
    .select('*')
    .eq('id', transactionId)
    .single()

  if (txError && txError.code !== 'PGRST116') {
    throw new Error(`取得交易失敗: ${txError.message}`)
  }

  if (!transaction) return null

  // 並行取得明細
  const [itemsResult, paymentsResult, commissionsResult] = await Promise.all([
    db.from('transaction_items').select('*').eq('transaction_id', transactionId),
    db.from('transaction_payments').select('*').eq('transaction_id', transactionId),
    db.from('transaction_commissions').select('*').eq('transaction_id', transactionId),
  ])

  if (itemsResult.error) {
    throw new Error(`取得交易明細失敗: ${itemsResult.error.message}`)
  }

  if (paymentsResult.error) {
    throw new Error(`取得付款明細失敗: ${paymentsResult.error.message}`)
  }

  if (commissionsResult.error) {
    throw new Error(`取得抽成記錄失敗: ${commissionsResult.error.message}`)
  }

  return {
    ...transaction,
    items: itemsResult.data || [],
    payments: paymentsResult.data || [],
    commissions: commissionsResult.data || [],
  }
}

/**
 * 根據交易編號取得交易
 */
export async function getSalesTransactionByNo(
  db: SupabaseClient,
  tenantId: string,
  transactionNo: string
): Promise<SalesTransaction | null> {
  const { data, error } = await db
    .from('sales_transactions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('transaction_no', transactionNo)
    .maybeSingle()

  if (error) {
    throw new Error(`取得交易失敗: ${error.message}`)
  }

  return data
}

/**
 * 取得銷售統計
 */
export async function getSalesSummary(
  db: SupabaseClient,
  tenantId: string,
  branchId: string,
  date: string
): Promise<SalesSummary> {
  // 取得當日交易
  const { data: transactions, error: txError } = await db
    .from('sales_transactions')
    .select('id, status, total_amount')
    .eq('tenant_id', tenantId)
    .eq('branch_id', branchId)
    .eq('transaction_date', date)

  if (txError) {
    throw new Error(`取得銷售統計失敗: ${txError.message}`)
  }

  const completedTx = (transactions || []).filter((tx) => tx.status === 'COMPLETED')
  const voidedTx = (transactions || []).filter((tx) => tx.status === 'VOIDED')
  const refundedTx = (transactions || []).filter((tx) => tx.status === 'REFUNDED')

  // 取得付款明細
  const txIds = completedTx.map((tx) => tx.id)
  let payments: TransactionPayment[] = []

  if (txIds.length > 0) {
    const { data: paymentData, error: paymentError } = await db
      .from('transaction_payments')
      .select('*')
      .in('transaction_id', txIds)

    if (paymentError) {
      throw new Error(`取得付款統計失敗: ${paymentError.message}`)
    }

    payments = paymentData || []
  }

  const totalSales = completedTx.reduce(
    (sum, tx) => sum + (parseFloat(String(tx.total_amount)) || 0),
    0
  )

  const cashAmount = payments
    .filter((p) => p.payment_method === 'CASH')
    .reduce((sum, p) => sum + (parseFloat(String(p.amount)) || 0), 0)

  const cardAmount = payments
    .filter((p) => p.payment_method === 'CARD')
    .reduce((sum, p) => sum + (parseFloat(String(p.amount)) || 0), 0)

  const balanceUsed = payments.reduce(
    (sum, p) => sum + (parseFloat(String(p.member_balance_used)) || 0),
    0
  )

  const refundedAmount = refundedTx.reduce(
    (sum, tx) => sum + (parseFloat(String(tx.total_amount)) || 0),
    0
  )

  return {
    totalSales,
    transactionCount: completedTx.length,
    averageTicket: completedTx.length > 0 ? totalSales / completedTx.length : 0,
    cashAmount,
    cardAmount,
    balanceUsed,
    voidedCount: voidedTx.length,
    refundedAmount,
  }
}

// ============================================
// 寫入函數
// ============================================

/**
 * 建立銷售交易
 */
export async function createSalesTransaction(
  db: SupabaseClient,
  input: CreateSalesTransactionInput
): Promise<SalesTransactionFull> {
  const transactionNo = await generateTransactionNo(db, input.tenant_id, input.branch_id)
  const transactionId = crypto.randomUUID()
  const now = new Date()

  // 計算金額
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const discountAmount = input.discount_amount || 0
  const totalAmount = subtotal - discountAmount

  // 驗證付款金額
  const paymentTotal = input.payments.reduce((sum, p) => sum + p.amount, 0)
  if (Math.abs(paymentTotal - totalAmount) > 0.01) {
    throw new Error(`付款金額 ${paymentTotal} 與應付金額 ${totalAmount} 不符`)
  }

  // 建立主交易
  const { data: transaction, error: txError } = await db
    .from('sales_transactions')
    .insert({
      id: transactionId,
      tenant_id: input.tenant_id,
      branch_id: input.branch_id,
      transaction_no: transactionNo,
      transaction_date: now.toISOString().split('T')[0],
      transaction_time: now.toISOString(),
      member_id: input.member_id || null,
      member_name: input.member_name || null,
      subtotal,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      tax_amount: 0,
      discount_type: input.discount_type || null,
      discount_reason: input.discount_reason || null,
      status: 'COMPLETED',
      created_by: input.created_by || null,
    })
    .select()
    .single()

  if (txError) {
    throw new Error(`建立交易失敗: ${txError.message}`)
  }

  // 建立交易明細
  const itemsToInsert = input.items.map((item) => ({
    id: crypto.randomUUID(),
    transaction_id: transactionId,
    service_id: item.service_id || null,
    service_package_id: item.service_package_id || null,
    item_name: item.item_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    amount: item.quantity * item.unit_price,
    staff_id: item.staff_id || null,
    staff_name: item.staff_name || null,
  }))

  const { data: items, error: itemsError } = await db
    .from('transaction_items')
    .insert(itemsToInsert)
    .select()

  if (itemsError) {
    throw new Error(`建立交易明細失敗: ${itemsError.message}`)
  }

  // 建立付款明細
  const paymentsToInsert = input.payments.map((payment) => ({
    id: crypto.randomUUID(),
    transaction_id: transactionId,
    payment_method: payment.payment_method,
    amount: payment.amount,
    received_amount: payment.received_amount || null,
    change_amount:
      payment.received_amount && payment.payment_method === 'CASH'
        ? payment.received_amount - payment.amount
        : null,
    member_balance_used: payment.member_balance_used || null,
  }))

  const { data: payments, error: paymentsError } = await db
    .from('transaction_payments')
    .insert(paymentsToInsert)
    .select()

  if (paymentsError) {
    throw new Error(`建立付款明細失敗: ${paymentsError.message}`)
  }

  return {
    ...transaction,
    items: items || [],
    payments: payments || [],
    commissions: [],
  }
}

/**
 * 作廢交易
 */
export async function voidSalesTransaction(
  db: SupabaseClient,
  transactionId: string,
  voidReason: string,
  voidedBy: string
): Promise<SalesTransaction> {
  const existing = await getSalesTransactionById(db, transactionId)
  if (!existing) {
    throw new Error('交易不存在')
  }

  if (existing.status !== 'COMPLETED') {
    throw new Error('只能作廢已完成的交易')
  }

  if (existing.settlement_id) {
    throw new Error('已日結的交易不能作廢')
  }

  const { data, error } = await db
    .from('sales_transactions')
    .update({
      status: 'VOIDED',
      voided_at: new Date().toISOString(),
      void_reason: voidReason,
      voided_by: voidedBy,
    })
    .eq('id', transactionId)
    .select()
    .single()

  if (error) {
    throw new Error(`作廢交易失敗: ${error.message}`)
  }

  return data
}

/**
 * 退款交易
 */
export async function refundSalesTransaction(
  db: SupabaseClient,
  transactionId: string,
  refundReason: string,
  refundedBy: string
): Promise<SalesTransaction> {
  const existing = await getSalesTransactionById(db, transactionId)
  if (!existing) {
    throw new Error('交易不存在')
  }

  if (existing.status !== 'COMPLETED') {
    throw new Error('只能退款已完成的交易')
  }

  const { data, error } = await db
    .from('sales_transactions')
    .update({
      status: 'REFUNDED',
      voided_at: new Date().toISOString(),
      void_reason: refundReason,
      voided_by: refundedBy,
    })
    .eq('id', transactionId)
    .select()
    .single()

  if (error) {
    throw new Error(`退款失敗: ${error.message}`)
  }

  return data
}

/**
 * 記錄抽成
 */
export async function createTransactionCommission(
  db: SupabaseClient,
  transactionId: string,
  staffId: string,
  serviceAmount: number,
  commissionAmount: number,
  commissionRate?: number,
  ruleType?: string,
  ruleConfig?: Record<string, unknown>
): Promise<TransactionCommission> {
  const { data, error } = await db
    .from('transaction_commissions')
    .insert({
      id: crypto.randomUUID(),
      transaction_id: transactionId,
      staff_id: staffId,
      service_amount: serviceAmount,
      commission_amount: commissionAmount,
      commission_rate: commissionRate || null,
      rule_type: ruleType || null,
      rule_config: ruleConfig || null,
      is_settled: false,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`建立抽成記錄失敗: ${error.message}`)
  }

  return data
}

// ============================================
// RPC 版本（原子性操作）
// ============================================

/**
 * 建立完整銷售交易（RPC 版本 - 原子性操作）
 */
export async function createSalesTransactionRpc(
  db: SupabaseClient,
  tenantId: string,
  branchId: string,
  transactionData: {
    member_id?: string
    discount_type?: DiscountType
    discount_value?: number
    final_amount?: number
    invoice_number?: string
    notes?: string
    created_by?: string
  },
  items: Array<{
    service_id?: string
    staff_id?: string
    quantity: number
    unit_price: number
    discount_amount?: number
    subtotal: number
    notes?: string
  }>,
  payments: Array<{
    payment_method: PaymentMethodType
    amount: number
    reference?: string
  }>
): Promise<{
  id: string
  transaction_no: string
  total_amount: number
  final_amount: number
  status: SalesStatus
}> {
  const { data, error } = await db.rpc('create_sales_transaction', {
    p_tenant_id: tenantId,
    p_branch_id: branchId,
    p_transaction_data: transactionData,
    p_items: items,
    p_payments: payments,
  })

  if (error) {
    throw new Error(`建立交易失敗 (RPC): ${error.message}`)
  }

  return data
}

/**
 * 作廢銷售交易（RPC 版本 - 含餘額回退）
 */
export async function voidSalesTransactionRpc(
  db: SupabaseClient,
  transactionId: string,
  voidedBy: string,
  reason: string
): Promise<{ transaction_id: string; status: string }> {
  const { data, error } = await db.rpc('void_sales_transaction', {
    p_transaction_id: transactionId,
    p_voided_by: voidedBy,
    p_reason: reason,
  })

  if (error) {
    throw new Error(`作廢交易失敗 (RPC): ${error.message}`)
  }

  return data
}

/**
 * 計算交易抽成（RPC 版本）
 */
export async function calculateTransactionCommissionsRpc(
  db: SupabaseClient,
  transactionId: string
): Promise<{ transaction_id: string; total_commission: number }> {
  const { data, error } = await db.rpc('calculate_transaction_commissions', {
    p_transaction_id: transactionId,
  })

  if (error) {
    throw new Error(`計算抽成失敗 (RPC): ${error.message}`)
  }

  return data
}

/**
 * 取得銷售統計（RPC 版本）
 */
export async function getSalesSummaryRpc(
  db: SupabaseClient,
  tenantId: string,
  branchId: string | null,
  date: string
): Promise<SalesSummary> {
  const { data, error } = await db.rpc('get_sales_summary', {
    p_tenant_id: tenantId,
    p_branch_id: branchId,
    p_date: date,
  })

  if (error) {
    throw new Error(`取得銷售統計失敗 (RPC): ${error.message}`)
  }

  const totalSales = data.total_sales || 0
  const transactionCount = data.transaction_count || 0

  return {
    totalSales,
    transactionCount,
    voidedCount: data.voided_count || 0,
    refundedAmount: data.refunded_amount || 0,
    cashAmount: data.cash_amount || 0,
    cardAmount: data.card_amount || 0,
    balanceUsed: data.balance_used || 0,
    averageTicket: transactionCount > 0 ? totalSales / transactionCount : 0,
  }
}
