import { SupabaseClient } from '@/lib/db/supabase-client'
import type { OrderWithCustomer, OrderItem } from '@/lib/dal/orders'
import type { AccInvoice, CreateInvoiceInput } from '@/lib/dal/accounting/invoices.dal'
import { createInvoice } from '@/lib/dal/accounting/invoices.dal'
import type {
  GuangmaoInvoiceIssueData,
  GuangmaoProductItem,
  GuangmaoResponse,
  GuangmaoInvoiceResult,
} from './types'

/**
 * 從訂單資料生成光貿開立發票請求資料
 */
export function mapOrderToGuangmaoIssueData(
  order: OrderWithCustomer,
  items: OrderItem[],
  options: {
    carrierType?: string
    carrierId?: string
    loveCode?: string
  } = {},
): GuangmaoInvoiceIssueData {
  const isB2B = !!order.customer?.tax_id && order.customer.tax_id.length === 8

  const productItems: GuangmaoProductItem[] = items.map((item, index) => ({
    Description: item.product_name?.zh || item.description || '商品',
    Quantity: Number(item.quantity),
    UnitPrice: Number(item.unit_price),
    Amount: Number(item.amount),
    SequenceNumber: index + 1,
    ItemTaxType: '1', // 預設應稅
  }))

  const data: GuangmaoInvoiceIssueData = {
    OrderId: order.order_number,
    BuyerIdentifier: isB2B ? order.customer!.tax_id! : '0000000000',
    BuyerName: order.customer?.name.zh || '個人消費者',
    SalesAmount: Math.round(order.subtotal),
    TaxType: '1',
    TaxRate: 0.05,
    TaxAmount: Math.round(order.tax_amount),
    TotalAmount: Math.round(order.total_amount),
    ProductItem: productItems,
    DonateMark: options.loveCode ? '1' : '0',
    PrintMark: isB2B ? 'Y' : options.carrierId ? 'N' : 'Y',
  }

  if (options.carrierType) data.CarrierType = options.carrierType
  if (options.carrierId) data.CarrierId = options.carrierId
  if (options.loveCode) data.LoveCode = options.loveCode

  return data
}

/**
 * 檢查發票是否在當前申報期內（可作廢）
 * 台灣電子發票申報期為每兩個月一期 (1-2, 3-4, 5-6, 7-8, 9-10, 11-12)
 */
export function canVoidInvoice(invoiceDate: string | Date): boolean {
  const date = typeof invoiceDate === 'string' ? new Date(invoiceDate) : invoiceDate
  const now = new Date()

  const invoicePeriod = Math.ceil((date.getMonth() + 1) / 2)
  const currentPeriod = Math.ceil((now.getMonth() + 1) / 2)

  return date.getFullYear() === now.getFullYear() && invoicePeriod === currentPeriod
}

/**
 * 處理光貿開立發票回應 → 建立系統發票記錄
 */
export async function processGuangmaoIssueResponse(
  db: SupabaseClient,
  requestId: string,
  response: GuangmaoResponse<GuangmaoInvoiceResult>,
  orderId: string,
  companyId: string,
): Promise<AccInvoice> {
  if (response.code !== 0 || !response.data) {
    // 失敗 → 更新請求狀態
    await db
      .from('acc_invoice_requests')
      .update({
        status: 'FAILED',
        response_data: response,
        error_message: response.msg,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    throw new Error(`光貿開立失敗: ${response.msg} (Code: ${response.code})`)
  }

  const result = response.data

  // 1. 更新請求狀態
  await db
    .from('acc_invoice_requests')
    .update({
      status: 'SUCCESS',
      response_data: response,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  // 2. 取得訂單資料
  const { data: order } = await db.from('orders').select('*').eq('id', orderId).single()
  if (!order) throw new Error(`訂單 ${orderId} 不存在`)

  // 3. 建立系統發票記錄
  const invoiceInput: CreateInvoiceInput = {
    company_id: companyId,
    number: result.InvoiceNumber,
    type: 'OUTPUT',
    date: result.InvoiceDate,
    untaxed_amount: order.subtotal,
    tax_amount: order.tax_amount,
    total_amount: order.total_amount,
    order_id: orderId,
    source: 'GUANGMAO',
    guangmao_status: 'SUCCESS',
    guangmao_track_id: `${result.InvoiceNumber}-${result.RandomNumber}`,
  }

  const invoice = await createInvoice(db, invoiceInput)

  // 4. 關聯請求與發票
  await db.from('acc_invoice_requests').update({ invoice_id: invoice.id }).eq('id', requestId)

  return invoice
}

/**
 * 建立作廢發票請求
 */
export async function requestVoidInvoice(
  db: SupabaseClient,
  invoice: AccInvoice,
  reason: string,
  sellerTaxId: string,
) {
  if (!canVoidInvoice(invoice.date)) {
    throw new Error('該發票已跨期，無法作廢，請改用開立折讓單')
  }

  const { data: request, error } = await db
    .from('acc_invoice_requests')
    .insert({
      company_id: invoice.company_id,
      invoice_id: invoice.id,
      request_type: 'VOID',
      status: 'PENDING',
      request_data: {
        InvoiceNumber: invoice.number,
        InvoiceDate: invoice.date,
        BuyerIdentifier: invoice.counterparty_tax_id || '0000000000',
        SellerIdentifier: sellerTaxId,
        VoidReason: reason,
      },
    })
    .select()
    .single()

  if (error) throw new Error(`建立作廢請求失敗: ${error.message}`)
  return request
}
