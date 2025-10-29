import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'

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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('contracts')
      .select(`
        *,
        customer:customers(*),
        quotation:quotations(*)
      `)
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

    const body = await request.json()

    const { data: contract, error } = await supabase
      .from('contracts')
      .insert([{ ...body, user_id: user.id }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(contract, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating contract:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
