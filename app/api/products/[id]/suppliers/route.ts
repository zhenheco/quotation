import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import {
  getProductSupplierCosts,
  createProductSupplierCost,
  updateProductSupplierCost,
  deleteProductSupplierCost,
  setPreferredSupplier
} from '@/lib/dal/product-supplier-costs'
import { checkPermission } from '@/lib/cache/services'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: productId } = await params

  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const kv = getKVCache()
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'products:read_cost')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supplierCosts = await getProductSupplierCosts(db, productId)

    return NextResponse.json(supplierCosts)
  } catch (error: unknown) {
    console.error('Error fetching product supplier costs:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: productId } = await params

  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const kv = getKVCache()
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'products:write_cost')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json() as {
      supplier_name: string
      supplier_code?: string
      cost_price: number | string
      cost_currency: string
      is_preferred?: boolean
      notes?: string
    }

    if (!body.supplier_name || body.cost_price === undefined || !body.cost_currency) {
      return NextResponse.json(
        { error: 'supplier_name, cost_price and cost_currency are required' },
        { status: 400 }
      )
    }

    const costPrice = typeof body.cost_price === 'number' ? body.cost_price : parseFloat(body.cost_price)
    if (isNaN(costPrice) || costPrice < 0) {
      return NextResponse.json({ error: 'Invalid cost price' }, { status: 400 })
    }

    const supplierCost = await createProductSupplierCost(db, {
      product_id: productId,
      supplier_name: body.supplier_name,
      supplier_code: body.supplier_code,
      cost_price: costPrice,
      cost_currency: body.cost_currency,
      is_preferred: body.is_preferred,
      notes: body.notes
    })

    return NextResponse.json(supplierCost, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating product supplier cost:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  await params

  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const kv = getKVCache()
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'products:write_cost')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json() as {
      id: string
      supplier_name?: string
      supplier_code?: string
      cost_price?: number | string
      cost_currency?: string
      is_preferred?: boolean
      notes?: string
    }

    if (!body.id) {
      return NextResponse.json({ error: 'Supplier cost id is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}

    if (body.supplier_name !== undefined) updateData.supplier_name = body.supplier_name
    if (body.supplier_code !== undefined) updateData.supplier_code = body.supplier_code
    if (body.cost_currency !== undefined) updateData.cost_currency = body.cost_currency
    if (body.is_preferred !== undefined) updateData.is_preferred = body.is_preferred
    if (body.notes !== undefined) updateData.notes = body.notes

    if (body.cost_price !== undefined) {
      const costPrice = typeof body.cost_price === 'number' ? body.cost_price : parseFloat(body.cost_price)
      if (isNaN(costPrice) || costPrice < 0) {
        return NextResponse.json({ error: 'Invalid cost price' }, { status: 400 })
      }
      updateData.cost_price = costPrice
    }

    const supplierCost = await updateProductSupplierCost(db, body.id, updateData)

    return NextResponse.json(supplierCost)
  } catch (error: unknown) {
    console.error('Error updating product supplier cost:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  await params

  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const kv = getKVCache()
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'products:write_cost')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const supplierCostId = searchParams.get('supplierCostId')

    if (!supplierCostId) {
      return NextResponse.json({ error: 'supplierCostId is required' }, { status: 400 })
    }

    await deleteProductSupplierCost(db, supplierCostId)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting product supplier cost:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id: productId } = await params

  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const kv = getKVCache()
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'products:write_cost')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json() as { supplierCostId: string }

    if (!body.supplierCostId) {
      return NextResponse.json({ error: 'supplierCostId is required' }, { status: 400 })
    }

    await setPreferredSupplier(db, productId, body.supplierCostId)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error setting preferred supplier:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
