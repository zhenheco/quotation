import { createApiClient } from '@/lib/supabase/api'
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
 * GET /api/quotations/[id] - 取得單一報價單
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    console.log('[GET /api/quotations/[id]] Starting request for ID:', id)

    let supabase
    try {
      supabase = createApiClient(request)
      console.log('[GET /api/quotations/[id]] Supabase client created')
    } catch (clientError) {
      console.error('[GET /api/quotations/[id]] Failed to create Supabase client:', clientError)
      return NextResponse.json(
        {
          error: 'Authentication service unavailable',
          details: clientError instanceof Error ? clientError.message : String(clientError)
        },
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    let user
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      user = authUser
      console.log('[GET /api/quotations/[id]] User authenticated:', user?.id)
    } catch (authError) {
      console.error('[GET /api/quotations/[id]] Auth error:', authError)
      return NextResponse.json(
        {
          error: 'Authentication failed',
          details: authError instanceof Error ? authError.message : String(authError)
        },
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (!user) {
      console.log('[GET /api/quotations/[id]] No user found')
      return NextResponse.json(
        { error: 'Unauthorized' },
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    let quotation
    try {
      quotation = await getQuotationById(id, user.id)
      console.log('[GET /api/quotations/[id]] Quotation found:', !!quotation)
    } catch (dbError) {
      console.error('[GET /api/quotations/[id]] Database error:', dbError)
      return NextResponse.json(
        {
          error: 'Database query failed',
          details: dbError instanceof Error ? dbError.message : String(dbError)
        },
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (!quotation) {
      return NextResponse.json(
        { error: 'Quotation not found' },
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return NextResponse.json(quotation, {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('[GET /api/quotations/[id]] Unexpected error:', error)
    console.error('[GET /api/quotations/[id]] Error stack:', error instanceof Error ? error.stack : 'No stack')

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

/**
 * PUT /api/quotations/[id] - 更新報價單
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createApiClient(request)

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
      exchange_rate,
      subtotal,
      tax_rate,
      tax_amount,
      total,
      notes,
      payment_status,
      payment_due_date,
      total_paid,
      deposit_amount,
      deposit_paid_date,
      final_payment_amount,
      final_payment_due_date,
      contract_signed_date,
      contract_expiry_date,
      payment_frequency,
      next_collection_date,
      next_collection_amount,
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
      exchange_rate: exchange_rate !== undefined ? parseFloat(exchange_rate) : undefined,
      subtotal: subtotal !== undefined ? parseFloat(subtotal) : undefined,
      tax_rate: tax_rate !== undefined ? parseFloat(tax_rate) : undefined,
      tax_amount: tax_amount !== undefined ? parseFloat(tax_amount) : undefined,
      total: total !== undefined ? parseFloat(total) : undefined,
      notes: notes || undefined,
      payment_status,
      payment_due_date,
      total_paid: total_paid !== undefined ? parseFloat(total_paid) : undefined,
      deposit_amount: deposit_amount !== undefined ? parseFloat(deposit_amount) : undefined,
      deposit_paid_date,
      final_payment_amount: final_payment_amount !== undefined ? parseFloat(final_payment_amount) : undefined,
      final_payment_due_date,
      contract_signed_date,
      contract_expiry_date,
      payment_frequency,
      next_collection_date,
      next_collection_amount: next_collection_amount !== undefined ? parseFloat(next_collection_amount) : undefined,
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
 * PATCH /api/quotations/[id] - 部分更新報價單（用於狀態更新）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createApiClient(request)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { status: quotationStatus, contract_file_url } = body

    if (!quotationStatus && !contract_file_url) {
      return NextResponse.json(
        { error: 'At least one field is required' },
        { status: 400 }
      )
    }

    // 驗證報價單是否存在
    const existingQuotation = await getQuotationById(id, user.id)
    if (!existingQuotation) {
      return NextResponse.json(
        { error: 'Quotation not found or unauthorized' },
        { status: 404 }
      )
    }

    // 更新報價單
    const updateData: { status?: string; contract_file_url?: string } = {}
    if (quotationStatus) updateData.status = quotationStatus
    if (contract_file_url) updateData.contract_file_url = contract_file_url

    const quotation = await updateQuotation(id, user.id, updateData)

    return NextResponse.json(quotation)
  } catch (error) {
    console.error('Error updating quotation status:', error)
    return NextResponse.json(
      { error: 'Failed to update quotation status' },
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
    const supabase = createApiClient(request)

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
