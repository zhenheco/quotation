/**
 * POS 銷售業務邏輯服務
 * Account-system → quotation-system 整合
 */

import { SupabaseClient } from '@/lib/db/supabase-client'
import {
  SalesTransaction,
  SalesTransactionFull,
  SalesQueryOptions,
  SalesSummary,
  DiscountType,
  PaymentMethodType,
  SalesStatus,
  getSalesTransactions,
  getSalesTransactionById,
  getSalesTransactionByNo,
  getSalesSummary,
  createSalesTransaction,
  voidSalesTransaction,
  refundSalesTransaction,
  createSalesTransactionRpc,
  voidSalesTransactionRpc,
  calculateTransactionCommissionsRpc,
  getSalesSummaryRpc,
} from '@/lib/dal/pos'

// ============================================
// 類型定義
// ============================================

export interface SalesListResult {
  transactions: SalesTransaction[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CreateSalesRequest {
  tenant_id: string
  branch_id: string
  member_id?: string
  member_name?: string
  discount_type?: DiscountType
  discount_amount?: number
  discount_reason?: string
  items: Array<{
    service_id?: string
    service_package_id?: string
    item_name: string
    quantity: number
    unit_price: number
    staff_id?: string
    staff_name?: string
  }>
  payments: Array<{
    payment_method: PaymentMethodType
    amount: number
    received_amount?: number
    member_balance_used?: number
  }>
  created_by?: string
}

export interface DailySalesReport {
  date: string
  summary: SalesSummary
  byPaymentMethod: Record<string, number>
  byService: Array<{ service_name: string; count: number; amount: number }>
  byStaff: Array<{ staff_name: string; count: number; amount: number }>
}

// ============================================
// 查詢服務
// ============================================

/**
 * 取得銷售交易列表（分頁）
 */
export async function listSalesTransactions(
  db: SupabaseClient,
  options: SalesQueryOptions & { page?: number; pageSize?: number }
): Promise<SalesListResult> {
  const page = options.page || 1
  const pageSize = options.pageSize || 20
  const offset = (page - 1) * pageSize

  const transactions = await getSalesTransactions(db, {
    ...options,
    limit: pageSize,
    offset,
  })

  // 取得總數
  const allTransactions = await getSalesTransactions(db, {
    ...options,
    limit: 10000,
    offset: 0,
  })

  return {
    transactions,
    total: allTransactions.length,
    page,
    pageSize,
    totalPages: Math.ceil(allTransactions.length / pageSize),
  }
}

/**
 * 取得交易詳情
 */
export async function getSalesDetail(
  db: SupabaseClient,
  transactionId: string
): Promise<SalesTransactionFull | null> {
  return getSalesTransactionById(db, transactionId)
}

/**
 * 根據交易編號查詢
 */
export async function findSalesByNumber(
  db: SupabaseClient,
  branchId: string,
  transactionNo: string
): Promise<SalesTransaction | null> {
  return getSalesTransactionByNo(db, branchId, transactionNo)
}

/**
 * 取得銷售統計
 */
export async function getDailySummary(
  db: SupabaseClient,
  tenantId: string,
  branchId: string | null,
  date: string,
  useRpc: boolean = true
): Promise<SalesSummary> {
  if (useRpc) {
    return getSalesSummaryRpc(db, tenantId, branchId, date)
  }
  return getSalesSummary(db, tenantId, branchId, date)
}

// ============================================
// 寫入服務
// ============================================

/**
 * 建立銷售交易（結帳）
 */
export async function createSale(
  db: SupabaseClient,
  request: CreateSalesRequest,
  useRpc: boolean = true
): Promise<SalesTransactionFull | { id: string; transaction_no: string; total_amount: number; final_amount: number; status: SalesStatus }> {
  // 驗證項目
  if (!request.items || request.items.length === 0) {
    throw new Error('交易必須包含至少一項商品或服務')
  }

  // 計算金額
  const subtotal = request.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const discountAmount = request.discount_amount || 0
  const totalAmount = subtotal - discountAmount

  if (totalAmount < 0) {
    throw new Error('折扣金額不能超過小計金額')
  }

  // 驗證付款金額
  const paymentTotal = request.payments.reduce((sum, p) => sum + p.amount, 0)
  if (Math.abs(paymentTotal - totalAmount) > 0.01) {
    throw new Error(`付款金額 ${paymentTotal} 與應付金額 ${totalAmount} 不符`)
  }

  // 驗證會員餘額付款
  const balancePayment = request.payments.find((p) => p.payment_method === 'BALANCE')
  if (balancePayment && !request.member_id) {
    throw new Error('使用餘額付款必須選擇會員')
  }

  if (useRpc) {
    return createSalesTransactionRpc(
      db,
      request.tenant_id,
      request.branch_id,
      {
        member_id: request.member_id,
        discount_type: request.discount_type,
        discount_value: request.discount_amount,
        final_amount: totalAmount,
        notes: request.discount_reason,
        created_by: request.created_by,
      },
      request.items.map((item) => ({
        service_id: item.service_id,
        staff_id: item.staff_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: 0,
        subtotal: item.quantity * item.unit_price,
        notes: item.item_name,
      })),
      request.payments.map((p) => ({
        payment_method: p.payment_method,
        amount: p.amount,
        reference: undefined,
      }))
    )
  }

  return createSalesTransaction(db, {
    tenant_id: request.tenant_id,
    branch_id: request.branch_id,
    member_id: request.member_id,
    member_name: request.member_name,
    discount_type: request.discount_type,
    discount_amount: request.discount_amount,
    discount_reason: request.discount_reason,
    items: request.items,
    payments: request.payments,
    created_by: request.created_by,
  })
}

/**
 * 作廢交易
 */
export async function voidSale(
  db: SupabaseClient,
  transactionId: string,
  voidedBy: string,
  reason: string,
  useRpc: boolean = true
): Promise<SalesTransaction | { transaction_id: string; status: string }> {
  const existing = await getSalesTransactionById(db, transactionId)
  if (!existing) {
    throw new Error('交易不存在')
  }

  if (existing.status !== 'COMPLETED') {
    throw new Error('只能作廢已完成的交易')
  }

  if (existing.settlement_id) {
    throw new Error('已日結的交易不能作廢，請使用退款功能')
  }

  if (!reason || reason.trim().length === 0) {
    throw new Error('請填寫作廢原因')
  }

  if (useRpc) {
    return voidSalesTransactionRpc(db, transactionId, voidedBy, reason)
  }

  return voidSalesTransaction(db, transactionId, reason, voidedBy)
}

/**
 * 退款交易
 */
export async function refundSale(
  db: SupabaseClient,
  transactionId: string,
  refundedBy: string,
  reason: string
): Promise<SalesTransaction> {
  const existing = await getSalesTransactionById(db, transactionId)
  if (!existing) {
    throw new Error('交易不存在')
  }

  if (existing.status !== 'COMPLETED') {
    throw new Error('只能退款已完成的交易')
  }

  if (!reason || reason.trim().length === 0) {
    throw new Error('請填寫退款原因')
  }

  return refundSalesTransaction(db, transactionId, reason, refundedBy)
}

/**
 * 計算員工抽成
 */
export async function calculateCommissions(
  db: SupabaseClient,
  transactionId: string
): Promise<{ transaction_id: string; total_commission: number }> {
  const existing = await getSalesTransactionById(db, transactionId)
  if (!existing) {
    throw new Error('交易不存在')
  }

  return calculateTransactionCommissionsRpc(db, transactionId)
}

// ============================================
// 報表服務
// ============================================

/**
 * 取得日銷售報表
 */
export async function getDailySalesReport(
  db: SupabaseClient,
  tenantId: string,
  branchId: string,
  date: string
): Promise<DailySalesReport> {
  // 取得統計摘要
  const summary = await getDailySummary(db, tenantId, branchId, date)

  // 取得當日所有交易
  const transactions = await getSalesTransactions(db, {
    tenantId,
    branchId,
    startDate: date,
    endDate: date,
    status: 'COMPLETED',
    limit: 1000,
    offset: 0,
  })

  // 按支付方式統計
  const byPaymentMethod: Record<string, number> = {
    CASH: summary.cashAmount,
    CARD: summary.cardAmount,
    BALANCE: summary.balanceUsed,
  }

  // 按服務統計（需要從交易明細計算）
  const serviceMap = new Map<string, { count: number; amount: number }>()
  const staffMap = new Map<string, { count: number; amount: number }>()

  for (const tx of transactions) {
    const full = await getSalesTransactionById(db, tx.id)
    if (!full) continue

    for (const item of full.items) {
      const serviceName = item.item_name || '未知服務'
      const staffName = item.staff_name || '未指定'

      const serviceEntry = serviceMap.get(serviceName) || { count: 0, amount: 0 }
      serviceEntry.count += item.quantity
      serviceEntry.amount += parseFloat(String(item.amount)) || 0
      serviceMap.set(serviceName, serviceEntry)

      if (item.staff_name) {
        const staffEntry = staffMap.get(staffName) || { count: 0, amount: 0 }
        staffEntry.count += item.quantity
        staffEntry.amount += parseFloat(String(item.amount)) || 0
        staffMap.set(staffName, staffEntry)
      }
    }
  }

  const byService = Array.from(serviceMap.entries())
    .map(([service_name, stats]) => ({ service_name, ...stats }))
    .sort((a, b) => b.amount - a.amount)

  const byStaff = Array.from(staffMap.entries())
    .map(([staff_name, stats]) => ({ staff_name, ...stats }))
    .sort((a, b) => b.amount - a.amount)

  return {
    date,
    summary,
    byPaymentMethod,
    byService,
    byStaff,
  }
}
