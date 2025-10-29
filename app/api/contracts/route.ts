import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { hasPermission } from '@/lib/services/rbac'

export const dynamic = 'force-dynamic'

/**
 * GET /api/contracts - 取得所有合約
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canRead = await hasPermission(user.id, 'contracts', 'read')
    if (!canRead) {
      return NextResponse.json({ error: 'Insufficient permissions to view contracts' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('customer_contracts')
      .select('*')
      .eq('user_id', user.id)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: contracts, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(contracts)
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
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canWrite = await hasPermission(user.id, 'contracts', 'write')
    if (!canWrite) {
      return NextResponse.json({ error: 'Insufficient permissions to create contracts' }, { status: 403 })
    }

    const body = await request.json()

    const { data: contract, error } = await supabase.rpc('create_contract', {
      p_user_id: user.id,
      p_customer_id: body.customer_id,
      p_quotation_id: body.quotation_id || null,
      p_contract_number: body.contract_number,
      p_title: body.title,
      p_description: body.description || null,
      p_start_date: body.start_date,
      p_end_date: body.end_date || null,
      p_total_amount: body.total_amount,
      p_currency: body.currency || 'TWD',
      p_payment_terms: body.payment_terms || null,
      p_billing_frequency: body.billing_frequency || 'one_time',
      p_next_billing_date: body.next_billing_date || null,
      p_auto_renew: body.auto_renew || false,
      p_status: body.status || 'draft'
    })

    if (error) throw error

    return NextResponse.json(contract, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating contract:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
