import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { markScheduleAsCollected } from '@/lib/dal/payments'

interface MarkCollectedInput {
  payment_date: string
  amount?: number
  payment_method?: 'bank_transfer' | 'credit_card' | 'check' | 'cash' | 'other'
  reference_number?: string
  notes?: string
}

function validateMarkCollectedInput(body: unknown): { valid: boolean; data?: MarkCollectedInput; error?: string } {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Request body must be an object' }
  }

  const input = body as Record<string, unknown>

  if (typeof input.payment_date !== 'string' || !input.payment_date) {
    return { valid: false, error: 'payment_date is required and must be a valid date string' }
  }

  if (input.amount !== undefined && (typeof input.amount !== 'number' || input.amount <= 0)) {
    return { valid: false, error: 'amount must be a positive number' }
  }

  if (input.payment_method !== undefined && !['bank_transfer', 'credit_card', 'check', 'cash', 'other'].includes(input.payment_method as string)) {
    return { valid: false, error: 'payment_method must be one of: bank_transfer, credit_card, check, cash, other' }
  }

  return {
    valid: true,
    data: {
      payment_date: input.payment_date,
      amount: input.amount as number | undefined,
      payment_method: input.payment_method as 'bank_transfer' | 'credit_card' | 'check' | 'cash' | 'other' | undefined,
      reference_number: input.reference_number as string | undefined,
      notes: input.notes as string | undefined,
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scheduleId } = await params
    const { env } = await getCloudflareContext()
    const supabase = createApiClient(request)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getSupabaseClient()
    const kv = getKVCache(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'payments:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validation = validateMarkCollectedInput(body)

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || 'Invalid request data' },
        { status: 400 }
      )
    }

    const result = await markScheduleAsCollected(
      db,
      user.id,
      scheduleId,
      validation.data
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Mark collected error:', error)

    if ((error as Error).message === 'Schedule not found') {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }

    if ((error as Error).message === 'Schedule already paid') {
      return NextResponse.json(
        { error: 'Schedule already paid' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
