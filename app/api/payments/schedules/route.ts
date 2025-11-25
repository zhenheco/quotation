import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getD1Client } from '@/lib/db/d1-client'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import {
  createPaymentSchedule,
  getPaymentSchedules,
  syncQuotationToPaymentSchedules
} from '@/lib/dal/payments'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const customerId = searchParams.get('customer_id') || undefined
  const quotationId = searchParams.get('quotation_id') || undefined
  const status = searchParams.get('status') || undefined
  const sourceType = searchParams.get('source_type') || undefined
  const dueDateFrom = searchParams.get('due_date_from') || undefined
  const dueDateTo = searchParams.get('due_date_to') || undefined

  const { env } = await getCloudflareContext()
  const db = getD1Client(env)

  const schedules = await getPaymentSchedules(db, user.id, {
    customer_id: customerId,
    quotation_id: quotationId,
    status,
    source_type: sourceType,
    due_date_from: dueDateFrom,
    due_date_to: dueDateTo,
  })

  return NextResponse.json({ schedules })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as {
    customer_id?: string
    quotation_id?: string
    due_date?: string
    amount?: number
    currency?: string
    description?: string
    notes?: string
    action?: 'create' | 'sync'
  }

  const { env } = await getCloudflareContext()
  const db = getD1Client(env)

  if (body.action === 'sync') {
    if (!body.quotation_id) {
      return NextResponse.json({ error: 'quotation_id is required for sync action' }, { status: 400 })
    }

    const result = await syncQuotationToPaymentSchedules(db, user.id, body.quotation_id)
    return NextResponse.json(result)
  }

  if (!body.customer_id) {
    return NextResponse.json({ error: 'customer_id is required' }, { status: 400 })
  }
  if (!body.due_date) {
    return NextResponse.json({ error: 'due_date is required' }, { status: 400 })
  }
  if (!body.amount || body.amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
  }
  if (!body.currency) {
    return NextResponse.json({ error: 'currency is required' }, { status: 400 })
  }

  const schedule = await createPaymentSchedule(db, user.id, {
    customer_id: body.customer_id,
    quotation_id: body.quotation_id,
    due_date: body.due_date,
    amount: body.amount,
    currency: body.currency,
    description: body.description,
    notes: body.notes,
  })

  return NextResponse.json({ schedule }, { status: 201 })
}
