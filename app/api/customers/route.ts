import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { createCustomer } from '@/lib/services/database'
import { toJsonbField } from '@/lib/utils/jsonb-converter'

export const dynamic = 'force-dynamic'

/**
 * GET /api/customers - 取得所有客戶
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient(request)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(customers)
  } catch (error: unknown) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * POST /api/customers - 建立新客戶
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)

    // 驗證用戶
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 取得請求資料
    const body = await request.json()
    const { name, email, phone, address, tax_id, contact_person } = body

    // 驗證必填欄位（只有 name 必填）
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // 建立客戶（轉換 JSONB 格式，所有欄位都是選填）
    const customer = await createCustomer({
      user_id: user.id,
      name: toJsonbField(name),
      email: email || undefined,
      phone: phone || undefined,
      address: address ? toJsonbField(address) : undefined,
      tax_id: tax_id || undefined,
      contact_person: contact_person ? toJsonbField(contact_person) : undefined,
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    )
  }
}
