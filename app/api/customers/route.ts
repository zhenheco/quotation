import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createCustomer } from '@/lib/services/database'

/**
 * POST /api/customers - 建立新客戶
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

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

    // 驗證必填欄位
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // 建立客戶
    const customer = await createCustomer({
      user_id: user.id,
      name,
      email,
      phone: phone || undefined,
      address: address || undefined,
      tax_id: tax_id || undefined,
      contact_person: contact_person || undefined,
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
