import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { getContracts, createContract } from '@/lib/dal/contracts'

// Note: Edge runtime removed for OpenNext compatibility

/**
 * GET /api/contracts - 取得所有合約
 */
export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext()
    const supabase = createApiClient(request)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getSupabaseClient()
    const kv = getKVCache(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'contracts:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions to view contracts' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const contracts = await getContracts(db, user.id)

    const filteredContracts = status
      ? contracts.filter(c => c.status === status)
      : contracts

    return NextResponse.json(filteredContracts)
  } catch (error: unknown) {
    console.error('Error fetching contracts:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * POST /api/contracts - 建立新合約
 */
export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext()
    const supabase = createApiClient(request)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getSupabaseClient()
    const kv = getKVCache(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'contracts:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions to create contracts' }, { status: 403 })
    }

    const body = await request.json() as Record<string, unknown>

    const contract = await createContract(db, user.id, {
      company_id: body.company_id as string | null,
      customer_id: body.customer_id as string,
      quotation_id: (body.quotation_id as string | null) || null,
      contract_number: body.contract_number as string,
      title: body.title as string,
      description: (body.description as string | null) || null,
      start_date: body.start_date as string,
      end_date: body.end_date as string,
      status: (body.status as 'draft' | 'active' | 'expired' | 'completed' | 'cancelled') || 'draft',
      total_amount: body.total_amount as number,
      currency: (body.currency as string) || 'TWD',
      payment_collected: 0,
    })

    return NextResponse.json(contract, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating contract:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
