import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getProductById, updateProduct, deleteProduct } from '@/lib/dal/products'

interface UpdateProductRequestBody {
  name?: string | { zh: string; en: string }
  description?: string | { zh: string; en: string }
  base_price?: number | string
  base_currency?: string
  category?: string | null
  sku?: string
  cost_price?: number | string | null
  cost_currency?: string
  profit_margin?: number | string | null
  supplier?: string
  supplier_code?: string
  image_url?: string | null
}

/**
 * 解析並驗證數值欄位
 * @returns 解析後的數值，若為 null 則保持 null，若驗證失敗則返回 Error
 */
function parseNumericField(
  value: number | string | null | undefined,
  fieldName: string,
  options: { allowNegative?: boolean } = {}
): number | null | undefined | Error {
  if (value === undefined) return undefined
  if (value === null) return null

  const parsed = typeof value === 'number' ? value : parseFloat(value)

  if (isNaN(parsed)) {
    return new Error(`Invalid ${fieldName}`)
  }

  if (!options.allowNegative && parsed < 0) {
    return new Error(`Invalid ${fieldName}`)
  }

  return parsed
}

/**
 * 轉換雙語欄位（字串或物件）
 */
function toBilingualField(
  value: string | { zh: string; en: string } | undefined
): { zh: string; en: string } | undefined {
  if (value === undefined) return undefined
  return typeof value === 'string'
    ? { zh: value, en: value }
    : value
}

/**
 * GET /api/products/[id] - 取得單一產品
 */
export const GET = withAuth('products:read')<{ id: string }>(
  async (_request, { user, db }, { id }) => {
    // 取得產品資料
    const product = await getProductById(db, user.id, id)

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  }
)

/**
 * PUT /api/products/[id] - 更新產品
 */
export const PUT = withAuth('products:write')<{ id: string }>(
  async (request, { user, db }, { id }) => {
    // 取得請求資料
    const body = (await request.json()) as UpdateProductRequestBody

    // 驗證數值欄位
    const basePrice = parseNumericField(body.base_price, 'price')
    if (basePrice instanceof Error) {
      return NextResponse.json({ error: basePrice.message }, { status: 400 })
    }

    const costPrice = parseNumericField(body.cost_price, 'cost price')
    if (costPrice instanceof Error) {
      return NextResponse.json({ error: costPrice.message }, { status: 400 })
    }

    const profitMargin = parseNumericField(body.profit_margin, 'profit margin', { allowNegative: true })
    if (profitMargin instanceof Error) {
      return NextResponse.json({ error: profitMargin.message }, { status: 400 })
    }

    // 準備更新資料（僅包含有定義的欄位）
    const updateData: Partial<{
      name: { zh: string; en: string }
      description?: { zh: string; en: string }
      base_price: number
      base_currency: string
      category?: string | null
      sku?: string
      cost_price?: number | null
      cost_currency?: string
      profit_margin?: number | null
      supplier?: string
      image_url?: string | null
    }> = {
      ...(toBilingualField(body.name) && { name: toBilingualField(body.name)! }),
      ...(body.description !== undefined && { description: toBilingualField(body.description) }),
      ...(basePrice !== undefined && basePrice !== null && { base_price: basePrice }),
      ...(body.base_currency !== undefined && { base_currency: body.base_currency }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.sku !== undefined && { sku: body.sku }),
      ...(costPrice !== undefined && { cost_price: costPrice }),
      ...(body.cost_currency !== undefined && { cost_currency: body.cost_currency }),
      ...(profitMargin !== undefined && { profit_margin: profitMargin }),
      ...(body.supplier !== undefined && { supplier: body.supplier }),
      ...(body.image_url !== undefined && { image_url: body.image_url }),
    }

    // 更新產品（DAL 會自動處理 JSON 序列化）
    const product = await updateProduct(db, user.id, id, updateData)

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  }
)

/**
 * DELETE /api/products/[id] - 刪除產品
 */
export const DELETE = withAuth('products:delete')<{ id: string }>(
  async (_request, { user, db }, { id }) => {
    // 刪除產品
    await deleteProduct(db, user.id, id)

    return NextResponse.json({ message: 'Product deleted successfully' })
  }
)
