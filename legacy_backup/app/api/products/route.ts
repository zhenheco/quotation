import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { getProducts, createProduct } from '@/lib/dal/products'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'
// Note: Edge runtime removed for OpenNext compatibility;

interface CreateProductRequestBody {
  name: string;
  description?: string;
  base_price: number | string;
  base_currency: string;
  category?: string;
  sku?: string;
  cost_price?: number | string;
  cost_currency?: string;
  profit_margin?: number | string;
  supplier?: string;
  supplier_code?: string;
}


/**
 * GET /api/products - 取得所有產品
 */
export async function GET(request: NextRequest) {
  const { env } = await getCloudflareContext()

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
export async function POST(request: NextRequest) {
  const { env } = await getCloudflareContext()

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
    const body = await request.json() as CreateProductRequestBody

    // 驗證必填欄位
    if (!body.name || body.base_price === undefined || !body.base_currency) {
      return NextResponse.json(
        { error: 'Name, base_price and base_currency are required' },
        { status: 400 }
      )
    }

    // 驗證價格
    const price = typeof body.base_price === 'number' ? body.base_price : parseFloat(body.base_price)
    if (isNaN(price) || price < 0) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
    }

    // 驗證成本價格（如有提供）
    let costPrice: number | undefined = undefined
    if (body.cost_price !== undefined) {
      const parsedCost = typeof body.cost_price === 'number' ? body.cost_price : parseFloat(body.cost_price)
      if (isNaN(parsedCost) || parsedCost < 0) {
        return NextResponse.json({ error: 'Invalid cost price' }, { status: 400 })
      }
      costPrice = parsedCost
    }

    // 驗證利潤率（如有提供）
    let profitMargin: number | undefined = undefined
    if (body.profit_margin !== undefined) {
      const parsedMargin = typeof body.profit_margin === 'number' ? body.profit_margin : parseFloat(body.profit_margin)
      if (isNaN(parsedMargin)) {
        return NextResponse.json({ error: 'Invalid profit margin' }, { status: 400 })
      }
      profitMargin = parsedMargin
    }

    // 建立產品（DAL 會自動處理 JSON 序列化）
    const product = await createProduct(db, user.id, {
      name: typeof body.name === 'string' ? { zh: body.name, en: body.name } : body.name,
      description: body.description ? (typeof body.description === 'string' ? { zh: body.description, en: body.description } : body.description) : undefined,
      unit_price: price,
      currency: body.base_currency,
      category: body.category,
      sku: body.sku,
      cost_price: costPrice,
      cost_currency: body.cost_currency,
      profit_margin: profitMargin,
      supplier: body.supplier,
      base_price: price
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
