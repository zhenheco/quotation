import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { getProductById, updateProduct, deleteProduct } from '@/lib/dal/products'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'
export const runtime = 'edge';

interface UpdateProductRequestBody {
  name?: string;
  description?: string;
  base_price?: number | string;
  base_currency?: string;
  category?: string;
  sku?: string;
  cost_price?: number | string | null;
  cost_currency?: string;
  profit_margin?: number | string | null;
  supplier?: string;
  supplier_code?: string;
}


/**
 * GET /api/products/[id] - 取得單一產品
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = await getCloudflareContext()

  try {
    const { id } = await params

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
    const product = await getProductById(db, user.id, id)

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // 映射欄位以維持向後相容
    const result = {
      ...product,
      unit_price: product.base_price,
      currency: product.base_currency
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Error fetching product:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * PUT /api/products/[id] - 更新產品
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = await getCloudflareContext()

  try {
    const { id } = await params

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
    const body = await request.json() as UpdateProductRequestBody

    // 準備更新資料
    const updateData: Partial<{
      name: { zh: string; en: string }
      description?: { zh: string; en: string }
      unit_price: number
      currency: string
      category?: string
      sku?: string
      cost_price?: number | null
      cost_currency?: string
      profit_margin?: number | null
      supplier?: string
      base_price?: number
    }> = {}

    // 驗證和轉換數值欄位
    if (body.base_price !== undefined) {
      const price = typeof body.base_price === 'number' ? body.base_price : parseFloat(body.base_price)
      if (isNaN(price) || price < 0) {
        return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
      }
      updateData.unit_price = price
      updateData.base_price = price
    }

    if (body.cost_price !== undefined) {
      if (body.cost_price === null) {
        updateData.cost_price = null
      } else {
        const costPrice = typeof body.cost_price === 'number' ? body.cost_price : parseFloat(body.cost_price)
        if (isNaN(costPrice) || costPrice < 0) {
          return NextResponse.json({ error: 'Invalid cost price' }, { status: 400 })
        }
        updateData.cost_price = costPrice
      }
    }

    if (body.profit_margin !== undefined) {
      if (body.profit_margin === null) {
        updateData.profit_margin = null
      } else {
        const profitMargin = typeof body.profit_margin === 'number' ? body.profit_margin : parseFloat(body.profit_margin)
        if (isNaN(profitMargin)) {
          return NextResponse.json({ error: 'Invalid profit margin' }, { status: 400 })
        }
        updateData.profit_margin = profitMargin
      }
    }

    if (body.name !== undefined) {
      updateData.name = typeof body.name === 'string' ? { zh: body.name, en: body.name } : body.name as { zh: string; en: string }
    }
    if (body.description !== undefined) {
      updateData.description = typeof body.description === 'string' ? { zh: body.description, en: body.description } : body.description as { zh: string; en: string }
    }
    if (body.base_currency !== undefined) {
      updateData.currency = body.base_currency
    }
    if (body.category !== undefined) {
      updateData.category = body.category
    }
    if (body.sku !== undefined) {
      updateData.sku = body.sku
    }
    if (body.cost_currency !== undefined) {
      updateData.cost_currency = body.cost_currency
    }
    if (body.supplier !== undefined) {
      updateData.supplier = body.supplier
    }

    // 更新產品（DAL 會自動處理 JSON 序列化）
    const product = await updateProduct(db, user.id, id, updateData)

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // 映射欄位以維持向後相容
    const result = {
      ...product,
      unit_price: product.base_price,
      currency: product.base_currency
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * DELETE /api/products/[id] - 刪除產品
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = await getCloudflareContext()

  try {
    const { id } = await params

    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache(env)
    const db = getD1Client(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'products:delete')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 刪除產品
    await deleteProduct(db, user.id, id)

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error: unknown) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
