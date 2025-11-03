import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { createProduct } from '@/lib/services/database'
import { toJsonbField } from '@/lib/utils/jsonb-converter'
import { parseJsonbArray } from '@/lib/utils/jsonb-parser'

export const dynamic = 'force-dynamic'

/**
 * GET /api/products - 取得所有產品
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient(request)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const parsedProducts = parseJsonbArray(products || [], ['name', 'description'])

    const mappedProducts = parsedProducts.map(product => ({
      ...product,
      unit_price: product.base_price,
      currency: product.base_currency
    }))

    return NextResponse.json(mappedProducts)
  } catch (error: unknown) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * POST /api/products - 建立新產品
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

    // 驗證必填欄位
    if (!body.name || body.base_price === undefined || !body.base_currency) {
      return NextResponse.json(
        { error: 'Name, base_price and base_currency are required' },
        { status: 400 }
      )
    }

    // 驗證價格
    const price = parseFloat(body.base_price)
    if (isNaN(price) || price < 0) {
      return NextResponse.json(
        { error: 'Invalid price' },
        { status: 400 }
      )
    }

    // 建立產品資料物件
    const productData: Record<string, unknown> = {
      user_id: user.id,
      name: toJsonbField(body.name),
      description: toJsonbField(body.description),
      base_price: price,
      base_currency: body.base_currency,
      category: body.category || undefined,
      sku: body.sku || undefined,
    }

    // 成本相關欄位（可選）
    if (body.cost_price !== undefined) {
      const costPrice = parseFloat(body.cost_price)
      if (!isNaN(costPrice) && costPrice >= 0) {
        productData.cost_price = costPrice
      }
    }
    if (body.cost_currency) productData.cost_currency = body.cost_currency
    if (body.profit_margin !== undefined) {
      const profitMargin = parseFloat(body.profit_margin)
      if (!isNaN(profitMargin)) {
        productData.profit_margin = profitMargin
      }
    }
    if (body.supplier) productData.supplier = body.supplier
    if (body.supplier_code) productData.supplier_code = body.supplier_code

    // 建立產品
    const product = await createProduct(productData)

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
