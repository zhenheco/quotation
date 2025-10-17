import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateCustomer, deleteCustomer } from '@/lib/services/database'

/**
 * PUT /api/customers/[id] - 更新客戶
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // 更新客戶
    const customer = await updateCustomer(id, user.id, {
      name,
      email,
      phone: phone || undefined,
      address: address || undefined,
      tax_id: tax_id || undefined,
      contact_person: contact_person || undefined,
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/customers/[id] - 刪除客戶
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 驗證用戶
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 刪除客戶
    const success = await deleteCustomer(id, user.id)

    if (!success) {
      return NextResponse.json(
        { error: 'Customer not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Customer deleted successfully' })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    )
  }
}
