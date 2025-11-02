import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import {
  createQuotation,
  createQuotationItem,
  generateQuotationNumber,
  validateCustomerOwnership
} from '@/lib/services/database'

export const dynamic = 'force-dynamic'

/**
 * GET /api/quotations - 取得所有報價單
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient(request)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: quotations, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customer:customers(name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const formattedQuotations = quotations?.map(q => {
      const { customer, ...rest } = q
      return {
        ...rest,
        customer_name: customer?.name || null
      }
    })

    return NextResponse.json(formattedQuotations)
  } catch (error: unknown) {
    console.error('Error fetching quotations:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * POST /api/quotations - 建立新報價單
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
