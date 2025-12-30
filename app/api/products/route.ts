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

  // 解析價格（預設為 0）
  const price =
    body.base_price !== undefined
      ? typeof body.base_price === 'number'
        ? body.base_price
        : parseFloat(body.base_price) || 0
      : 0

  // 驗證成本價格（如有提供）
  let costPrice: number | undefined = undefined
  if (body.cost_price !== undefined) {
    const parsedCost =
      typeof body.cost_price === 'number' ? body.cost_price : parseFloat(body.cost_price)
    if (isNaN(parsedCost) || parsedCost < 0) {
      return NextResponse.json({ error: 'Invalid cost price' }, { status: 400 })
    }
    costPrice = parsedCost
  }

  // 驗證利潤率（如有提供）
  let profitMargin: number | undefined = undefined
  if (body.profit_margin !== undefined) {
    const parsedMargin =
      typeof body.profit_margin === 'number' ? body.profit_margin : parseFloat(body.profit_margin)
    if (isNaN(parsedMargin)) {
      return NextResponse.json({ error: 'Invalid profit margin' }, { status: 400 })
    }
    profitMargin = parsedMargin
  }

  // 準備產品資料
  const productData = {
    name: body.name
      ? typeof body.name === 'string'
        ? { zh: body.name, en: body.name }
        : body.name
      : { zh: '', en: '' },
    description: body.description
      ? typeof body.description === 'string'
        ? { zh: body.description, en: body.description }
        : body.description
      : undefined,
    base_price: price,
    base_currency: body.base_currency || 'TWD',
    sku: body.sku,
    cost_price: costPrice,
    cost_currency: body.cost_currency,
    profit_margin: profitMargin,
    supplier: body.supplier,
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
