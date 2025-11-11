import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { getCustomerById, updateCustomer, deleteCustomer } from '@/lib/dal/customers'
import { checkPermission } from '@/lib/cache/services'


/**
 * GET /api/customers/[id] - 取得單一客戶
 */
export async function GET(
  request: NextRequest,
  { params, env }: { params: Promise<{ id: string }>; env: { DB: D1Database; KV: KVNamespace } }
) {
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

    const hasPermission = await checkPermission(kv, db, user.id, 'customers:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得客戶資料
    const customer = await getCustomerById(db, user.id, id)

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json(customer)
  } catch (error: unknown) {
    console.error('Error fetching customer:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * PUT /api/customers/[id] - 更新客戶
 */
export async function PUT(
  request: NextRequest,
  { params, env }: { params: Promise<{ id: string }>; env: { DB: D1Database; KV: KVNamespace } }
) {
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

    const hasPermission = await checkPermission(kv, db, user.id, 'customers:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 取得請求資料
    const body = await request.json()

    // 更新客戶（DAL 會自動處理 JSON 序列化和過濾 undefined）
    const customer = await updateCustomer(db, user.id, id, body)

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json(customer)
  } catch (error: unknown) {
    console.error('Error updating customer:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * DELETE /api/customers/[id] - 刪除客戶
 */
export async function DELETE(
  request: NextRequest,
  { params, env }: { params: Promise<{ id: string }>; env: { DB: D1Database; KV: KVNamespace } }
) {
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

    const hasPermission = await checkPermission(kv, db, user.id, 'customers:delete')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 刪除客戶
    await deleteCustomer(db, user.id, id)

    return NextResponse.json({ message: 'Customer deleted successfully' })
  } catch (error: unknown) {
    console.error('Error deleting customer:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
