import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { getPaymentTerms, batchCreatePaymentTerms, deletePaymentTerm } from '@/lib/dal/payment-terms'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = await getCloudflareContext()

  try {
    const { id } = await params

    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const kv = getKVCache(env)
    const db = getD1Client(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const paymentTerms = await getPaymentTerms(db, user.id, id)

    return NextResponse.json({ payment_terms: paymentTerms })
  } catch (error: unknown) {
    console.error('Error fetching payment terms:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = await getCloudflareContext()

  try {
    const { id } = await params

    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const kv = getKVCache(env)
    const db = getD1Client(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    interface PostPaymentTermsBody {
      terms: Array<{
        term_number: number
        percentage: number
        due_date?: string | null
      }>
      total: number
    }

    const body = await request.json() as PostPaymentTermsBody
    const { terms, total } = body

    console.log('[payment-terms API] Received:', {
      quotationId: id,
      userId: user.id,
      termsCount: terms?.length || 0,
      terms,
      total
    })

    // 刪除舊的付款條款
    const oldTerms = await getPaymentTerms(db, user.id, id)
    console.log('[payment-terms API] Old terms count:', oldTerms.length)
    for (const oldTerm of oldTerms) {
      await deletePaymentTerm(db, user.id, oldTerm.id)
    }

    // 建立新的付款條款
    console.log('[payment-terms API] Creating new terms...')
    const paymentTerms = await batchCreatePaymentTerms(
      db,
      user.id,
      id,
      terms,
      total
    )
    console.log('[payment-terms API] Created terms:', paymentTerms.length)

    return NextResponse.json({ payment_terms: paymentTerms })
  } catch (error: unknown) {
    console.error('Error saving payment terms:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
