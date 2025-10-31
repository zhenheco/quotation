import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'

/**
 * GET /api/products/[id] - 取得單一產品
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/products/[id] - 更新產品
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

    // 構建更新資料
    const updateData: Record<string, unknown> = {}
    if (body.name) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.unit_price !== undefined) updateData.unit_price = parseFloat(body.unit_price)
    if (body.currency) updateData.currency = body.currency
    if (body.category !== undefined) updateData.category = body.category
    if (body.cost_price !== undefined) updateData.cost_price = body.cost_price ? parseFloat(body.cost_price) : null
    if (body.cost_currency !== undefined) updateData.cost_currency = body.cost_currency
    if (body.profit_margin !== undefined) updateData.profit_margin = body.profit_margin ? parseFloat(body.profit_margin) : null
    if (body.supplier !== undefined) updateData.supplier = body.supplier
    if (body.supplier_code !== undefined) updateData.supplier_code = body.supplier_code
    if (body.sku !== undefined) updateData.sku = body.sku
    updateData.updated_at = new Date().toISOString()

    // 更新產品
    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !product) {
      return NextResponse.json(
        { error: 'Product not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/products/[id] - 刪除產品
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

    // 刪除產品
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json(
        { error: 'Product not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
