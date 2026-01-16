import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getProducts, createProduct, createProductWithRetry } from '@/lib/dal/products'

interface CreateProductRequestBody {
  name: string
  description?: string
  base_price: number | string
  base_currency: string
  category?: string
  sku?: string
  product_number?: string
  company_id?: string
  cost_price?: number | string
  cost_currency?: string
  profit_margin?: number | string
  supplier?: string
  supplier_code?: string
}

/**
 * 安全解析數值，返回解析後的值或 undefined
 */
function parsePrice(value: number | string | undefined): number | undefined {
  if (value === undefined) return undefined
  const parsed = typeof value === 'number' ? value : parseFloat(value)
  return isNaN(parsed) || parsed < 0 ? undefined : parsed
}

/**
 * 轉換雙語欄位
 */
function toBilingual(value: string | undefined): { zh: string; en: string } | undefined {
  if (!value) return undefined
  return { zh: value, en: value }
}

/**
 * GET /api/products - 取得所有產品
 */
export const GET = withAuth('products:read')(async (_request, { user, db }) => {
  // 取得產品資料
  const products = await getProducts(db, user.id)

  // 設定快取：私有快取 60 秒，過期後允許返回舊資料 120 秒
  const response = NextResponse.json(products)
  response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120')
  return response
})

/**
 * POST /api/products - 建立新產品
 */
export const POST = withAuth('products:write')(async (request, { user, db }) => {
  // 取得請求資料
  const body = (await request.json()) as CreateProductRequestBody

  // 解析數值欄位
  const price = parsePrice(body.base_price) ?? 0
  const costPrice = parsePrice(body.cost_price)
  const profitMargin = parsePrice(body.profit_margin)

  // 驗證成本價格（如有提供但解析失敗）
  if (body.cost_price !== undefined && costPrice === undefined) {
    return NextResponse.json({ error: 'Invalid cost price' }, { status: 400 })
  }

  // 驗證利潤率（如有提供但解析失敗）
  if (body.profit_margin !== undefined && profitMargin === undefined) {
    return NextResponse.json({ error: 'Invalid profit margin' }, { status: 400 })
  }

  // 準備產品資料
  const productData = {
    name: toBilingual(body.name) ?? { zh: '', en: '' },
    description: toBilingual(body.description),
    base_price: Math.round(price),
    base_currency: body.base_currency || 'TWD',
    category: body.category,
    sku: body.sku,
    cost_price: costPrice !== undefined ? Math.round(costPrice) : undefined,
    cost_currency: body.cost_currency,
    profit_margin: profitMargin,
    supplier: body.supplier,
    supplier_code: body.supplier_code,
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
      company_id: body.company_id,
    })
  } else if (body.company_id) {
    // 自動生成編號
    product = await createProductWithRetry(db, user.id, body.company_id, productData)
  } else {
    // 不帶編號建立
    product = await createProduct(db, user.id, productData)
  }

  return NextResponse.json(product, { status: 201 })
})
