import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { getSupplierById, updateSupplier, deleteSupplier } from '@/lib/dal/suppliers'
import { checkPermission } from '@/lib/cache/services'

/**
 * GET /api/suppliers/[id] - 取得單一供應商
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache()
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'suppliers:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得供應商
    const supplier = await getSupplierById(db, id)

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    return NextResponse.json(supplier)
  } catch (error: unknown) {
    console.error('Error fetching supplier:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * PUT /api/suppliers/[id] - 更新供應商
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache()
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'suppliers:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得請求資料
    const body = await request.json() as {
      name?: { zh: string; en: string } | string
      code?: string
      contact_person?: { name: string; phone: string; email: string }
      phone?: string
      email?: string
      fax?: string
      address?: { zh: string; en: string } | string
      website?: string
      tax_id?: string
      payment_terms?: string
      payment_days?: number
      bank_name?: string
      bank_account?: string
      bank_code?: string
      swift_code?: string
      is_active?: boolean
      notes?: string
    }

    const { name, address, ...rest } = body

    // 準備更新資料
    const updateData: Parameters<typeof updateSupplier>[2] = {
      ...rest,
    }

    if (name !== undefined) {
      updateData.name = typeof name === 'string' ? { zh: name, en: name } : name
    }

    if (address !== undefined) {
      updateData.address = typeof address === 'string' ? { zh: address, en: address } : address
    }

    // 更新供應商
    const supplier = await updateSupplier(db, id, updateData)

    return NextResponse.json(supplier)
  } catch (error: unknown) {
    console.error('Error updating supplier:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * DELETE /api/suppliers/[id] - 刪除供應商
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // 驗證使用者
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查權限
    const kv = getKVCache()
    const db = getSupabaseClient()

    const hasPermission = await checkPermission(kv, db, user.id, 'suppliers:delete')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 刪除供應商
    await deleteSupplier(db, id)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting supplier:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
