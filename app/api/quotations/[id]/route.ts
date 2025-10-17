import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  updateQuotation,
  deleteQuotation,
  getQuotationById,
  createQuotationItem,
  validateCustomerOwnership
} from '@/lib/services/database'
import { getZeaburPool } from '@/lib/db/zeabur'

/**
 * PUT /api/quotations/[id] - 更新報價單
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
    const {
      customer_id,
      issue_date,
      valid_until,
      currency,
      subtotal,
      tax_rate,
      tax_amount,
      total_amount,
      notes,
      items
    } = body

    // 驗證報價單是否存在
    const existingQuotation = await getQuotationById(id, user.id)
    if (!existingQuotation) {
      return NextResponse.json(
        { error: 'Quotation not found or unauthorized' },
        { status: 404 }
      )
    }

    // 驗證客戶所有權（如果有提供）
    if (customer_id) {
      const isValidCustomer = await validateCustomerOwnership(customer_id, user.id)
      if (!isValidCustomer) {
        return NextResponse.json(
          { error: 'Invalid customer' },
          { status: 400 }
        )
      }
    }

    // 更新報價單
    const quotation = await updateQuotation(id, user.id, {
      customer_id,
      issue_date,
      valid_until,
      currency,
      subtotal: subtotal !== undefined ? parseFloat(subtotal) : undefined,
      tax_rate: tax_rate !== undefined ? parseFloat(tax_rate) : undefined,
      tax_amount: tax_amount !== undefined ? parseFloat(tax_amount) : undefined,
      total_amount: total_amount !== undefined ? parseFloat(total_amount) : undefined,
      notes: notes || undefined,
    })

    // 如果提供了項目，則刪除舊的並重新插入
    if (items && items.length > 0) {
      const pool = getZeaburPool()

      // 刪除舊項目
      await pool.query(
        'DELETE FROM quotation_items WHERE quotation_id = $1',
        [id]
      )

      // 插入新項目
      for (const item of items) {
        await createQuotationItem(id, user.id, {
          product_id: item.product_id || undefined,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          discount: parseFloat(item.discount || 0),
          subtotal: parseFloat(item.subtotal),
        })
      }
    }

    return NextResponse.json(quotation)
  } catch (error) {
    console.error('Error updating quotation:', error)
    return NextResponse.json(
      { error: 'Failed to update quotation' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/quotations/[id] - 刪除報價單
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

    const pool = getZeaburPool()

    // 先刪除報價單項目
    await pool.query(
      'DELETE FROM quotation_items WHERE quotation_id = $1',
      [id]
    )

    // 再刪除報價單
    const success = await deleteQuotation(id, user.id)

    if (!success) {
      return NextResponse.json(
        { error: 'Quotation not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Quotation deleted successfully' })
  } catch (error) {
    console.error('Error deleting quotation:', error)
    return NextResponse.json(
      { error: 'Failed to delete quotation' },
      { status: 500 }
    )
  }
}
