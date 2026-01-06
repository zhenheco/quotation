import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'

interface PaymentRecord {
  id: string
  amount: number
  payment_date: string
  quotation_id: string | null
}

interface PaymentScheduleRecord {
  id: string
  amount: number
  due_date: string
  status: string
  quotation_id: string | null
}

interface QuotationRecord {
  id: string
  quotation_number: string
  total_amount: number
  status: string
}

interface RelatedRecordsResponse {
  hasRelatedRecords: boolean
  payments: PaymentRecord[]
  schedules: PaymentScheduleRecord[]
  quotations: QuotationRecord[]
  totalPaymentsAmount: number
  totalSchedulesAmount: number
  totalQuotationsAmount: number
}

/**
 * GET /api/customers/[id]/related-payments - 檢查客戶的關聯付款紀錄
 */
export const GET = withAuth('customers:read')<{ id: string }>(
  async (_request, { db }, { id }) => {
    // 查詢 payments 表
    const { data: payments, error: paymentsError } = await db
      .from('payments')
      .select('id, amount, payment_date, quotation_id')
      .eq('customer_id', id)

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
    }

    // 查詢 payment_schedules 表
    const { data: schedules, error: schedulesError } = await db
      .from('payment_schedules')
      .select('id, amount, due_date, status, quotation_id')
      .eq('customer_id', id)

    if (schedulesError) {
      console.error('Error fetching payment schedules:', schedulesError)
    }

    // 查詢 quotations 表
    const { data: quotations, error: quotationsError } = await db
      .from('quotations')
      .select('id, quotation_number, total_amount, status')
      .eq('customer_id', id)

    if (quotationsError) {
      console.error('Error fetching quotations:', quotationsError)
    }

    const paymentsArray = (payments || []) as PaymentRecord[]
    const schedulesArray = (schedules || []) as PaymentScheduleRecord[]
    const quotationsArray = (quotations || []) as QuotationRecord[]

    const response: RelatedRecordsResponse = {
      hasRelatedRecords: paymentsArray.length > 0 || schedulesArray.length > 0 || quotationsArray.length > 0,
      payments: paymentsArray,
      schedules: schedulesArray,
      quotations: quotationsArray,
      totalPaymentsAmount: paymentsArray.reduce((sum, p) => sum + (p.amount || 0), 0),
      totalSchedulesAmount: schedulesArray.reduce((sum, s) => sum + (s.amount || 0), 0),
      totalQuotationsAmount: quotationsArray.reduce((sum, q) => sum + (q.total_amount || 0), 0)
    }

    return NextResponse.json(response)
  }
)
