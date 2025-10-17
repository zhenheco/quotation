import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createProduct } from '@/lib/services/database'

/**
 * POST /api/products - 建立新產品
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
    const { name, description, unit_price, currency, category } = body

    // 驗證必填欄位
    if (!name || unit_price === undefined || !currency) {
      return NextResponse.json(
        { error: 'Name, unit_price and currency are required' },
        { status: 400 }
      )
    }

    // 驗證價格
    const price = parseFloat(unit_price)
    if (isNaN(price) || price < 0) {
      return NextResponse.json(
        { error: 'Invalid price' },
        { status: 400 }
      )
    }

    // 建立產品
    const product = await createProduct({
      user_id: user.id,
      name,
      description: description || undefined,
      unit_price: price,
      currency: currency,
      category: category || undefined,
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
