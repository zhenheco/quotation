import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { getProducts, createProduct } from '@/lib/dal/products'
import { checkPermission } from '@/lib/cache/services'


/**
 * GET /api/products - 取得所有產品
 */
export async function GET(
  request: NextRequest,
  { env }: { env: { DB: D1Database; KV: KVNamespace } }
) {
  try {
    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache(env)
    const db = getD1Client(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'products:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得產品資料
    const products = await getProducts(db, user.id)

    // 映射欄位以維持向後相容
    const mappedProducts = products.map(product => ({
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
export async function POST(
  request: NextRequest,
  { env }: { env: { DB: D1Database; KV: KVNamespace } }
) {
  try {
    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache(env)
    const db = getD1Client(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'products:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
    }

    // 驗證成本價格（如有提供）
    let costPrice: number | null = null
    if (body.cost_price !== undefined) {
      costPrice = parseFloat(body.cost_price)
      if (isNaN(costPrice) || costPrice < 0) {
        return NextResponse.json({ error: 'Invalid cost price' }, { status: 400 })
      }
    }

    // 驗證利潤率（如有提供）
    let profitMargin: number | null = null
    if (body.profit_margin !== undefined) {
      profitMargin = parseFloat(body.profit_margin)
      if (isNaN(profitMargin)) {
        return NextResponse.json({ error: 'Invalid profit margin' }, { status: 400 })
      }
    }

    // 建立產品（DAL 會自動處理 JSON 序列化）
    const product = await createProduct(db, user.id, {
      name: body.name,
      description: body.description || null,
      base_price: price,
      base_currency: body.base_currency,
      category: body.category || null,
      sku: body.sku || null,
      cost_price: costPrice,
      cost_currency: body.cost_currency || null,
      profit_margin: profitMargin,
      supplier: body.supplier || null,
      supplier_code: body.supplier_code || null
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
