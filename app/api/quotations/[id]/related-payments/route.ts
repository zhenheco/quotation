import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { isValidUUID } from '@/lib/security'

interface PaymentRecord {
  id: string
  amount: number
  payment_date: string
}

interface PaymentScheduleRecord {
  id: string
  amount: number
  due_date: string
  status: string
}

interface RelatedPaymentsResponse {
  hasRelatedRecords: boolean
  payments: PaymentRecord[]
  schedules: PaymentScheduleRecord[]
  totalPaymentsAmount: number
  totalSchedulesAmount: number
}

/**
 * GET /api/quotations/[id]/related-payments - 檢查報價單的關聯付款紀錄
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 安全：驗證 UUID 格式
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid quotation ID format' }, { status: 400 })
    }

    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache()
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 查詢 payments 表
    const { data: payments, error: paymentsError } = await db
      .from('payments')
      .select('id, amount, payment_date')
      .eq('quotation_id', id)

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
    }

    // 查詢 payment_schedules 表
    const { data: schedules, error: schedulesError } = await db
      .from('payment_schedules')
      .select('id, amount, due_date, status')
      .eq('quotation_id', id)

    if (schedulesError) {
      console.error('Error fetching payment schedules:', schedulesError)
    }

    const paymentsArray = (payments || []) as PaymentRecord[]
    const schedulesArray = (schedules || []) as PaymentScheduleRecord[]

    const response: RelatedPaymentsResponse = {
      hasRelatedRecords: paymentsArray.length > 0 || schedulesArray.length > 0,
      payments: paymentsArray,
      schedules: schedulesArray,
      totalPaymentsAmount: paymentsArray.reduce((sum, p) => sum + (p.amount || 0), 0),
      totalSchedulesAmount: schedulesArray.reduce((sum, s) => sum + (s.amount || 0), 0)
    }

    return NextResponse.json(response)
  } catch (error: unknown) {
    console.error('Error checking related payments:', error)
    return NextResponse.json({ error: 'Failed to check related payments' }, { status: 500 })
  }
}
