import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateProduct, deleteProduct } from '@/lib/services/database'

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
    const { name, description, unit_price, currency, category } = body

    // 驗證價格（如果提供）
    if (unit_price !== undefined) {
      const price = parseFloat(unit_price)
      if (isNaN(price) || price < 0) {
        return NextResponse.json(
          { error: 'Invalid price' },
          { status: 400 }
        )
      }
    }

    // 更新產品
    const product = await updateProduct(id, user.id, {
      name,
      description: description || undefined,
      unit_price: unit_price !== undefined ? parseFloat(unit_price) : undefined,
      currency: currency,
      category: category || undefined,
    })

    if (!product) {
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
    const success = await deleteProduct(id, user.id)

    if (!success) {
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
