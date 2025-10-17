import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  createQuotation,
  createQuotationItem,
  generateQuotationNumber,
  validateCustomerOwnership
} from '@/lib/services/database'

/**
 * POST /api/quotations - 建立新報價單
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

    // 驗證必填欄位
    if (!customer_id || !issue_date || !valid_until || !currency || items?.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 驗證客戶所有權
    const isValidCustomer = await validateCustomerOwnership(customer_id, user.id)
    if (!isValidCustomer) {
      return NextResponse.json(
        { error: 'Invalid customer' },
        { status: 400 }
      )
    }

    // 生成報價單號碼
    const quotationNumber = await generateQuotationNumber(user.id)

    // 建立報價單
    const quotation = await createQuotation({
      user_id: user.id,
      customer_id,
      quotation_number: quotationNumber,
      status: 'draft',
      issue_date,
      valid_until,
      currency,
      subtotal: parseFloat(subtotal),
      tax_rate: parseFloat(tax_rate),
      tax_amount: parseFloat(tax_amount),
      total_amount: parseFloat(total_amount),
      notes: notes || undefined,
    })

    // 建立報價單項目
    if (items && items.length > 0) {
      for (const item of items) {
        await createQuotationItem(quotation.id, user.id, {
          product_id: item.product_id || undefined,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          discount: parseFloat(item.discount || 0),
          subtotal: parseFloat(item.subtotal),
        })
      }
    }

    return NextResponse.json(quotation, { status: 201 })
  } catch (error) {
    console.error('Error creating quotation:', error)
    return NextResponse.json(
      { error: 'Failed to create quotation' },
      { status: 500 }
    )
  }
}
