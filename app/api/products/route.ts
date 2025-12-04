import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { getProducts, createProduct, createProductWithRetry } from '@/lib/dal/products'
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
  product_number?: string;
  company_id?: string;
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
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'products:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得產品資料
    const products = await getProducts(db, user.id)

    return NextResponse.json(products)
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
    const db = getSupabaseClient()

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

    // 準備產品資料
    const productData = {
      name: typeof body.name === 'string' ? { zh: body.name, en: body.name } : body.name,
      description: body.description ? (typeof body.description === 'string' ? { zh: body.description, en: body.description } : body.description) : undefined,
      base_price: price,
      base_currency: body.base_currency,
      sku: body.sku,
      cost_price: costPrice,
      cost_currency: body.cost_currency,
      profit_margin: profitMargin,
      supplier: body.supplier
    }

    // 建立產品
    // 如果提供了 product_number（使用者自訂），直接使用
    // 如果提供了 company_id 但沒有 product_number，自動生成
    // 如果都沒有，不帶編號建立
    let product
    if (body.product_number) {
      // 使用者自訂編號
      product = await createProduct(db, user.id, {
        ...productData,
        product_number: body.product_number,
        company_id: body.company_id
      })
    } else if (body.company_id) {
      // 自動生成編號
      product = await createProductWithRetry(db, user.id, body.company_id, productData)
    } else {
      // 不帶編號建立
      product = await createProduct(db, user.id, productData)
    }

    return NextResponse.json(product, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
