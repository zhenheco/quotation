/**
 * POS 會員詳情 API Routes
 * Account-system → quotation-system 整合
 */

import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import {
  getMemberById,
  updateMember,
  deleteMember,
  getMemberDeposits,
} from '@/lib/dal/pos'
import type { UpdateMemberInput } from '@/lib/dal/pos'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/pos/members/[id] - 取得會員詳情
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { env } = await getCloudflareContext()
  const { id } = await params

  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const kv = getKVCache(env)
    const db = getSupabaseClient()

    // 檢查權限
    const hasPermission = await checkPermission(kv, db, user.id, 'pos:members:read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 判斷是否要取得儲值記錄
    const searchParams = request.nextUrl.searchParams
    const deposits = searchParams.get('deposits') === 'true'

    if (deposits) {
      const limit = parseInt(searchParams.get('limit') || '20')
      const depositList = await getMemberDeposits(db, id, limit)
      return NextResponse.json(depositList)
    }

    const member = await getMemberById(db, id)

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    return NextResponse.json(member)
  } catch (error: unknown) {
    console.error('Error fetching member:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * PUT /api/pos/members/[id] - 更新會員
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { env } = await getCloudflareContext()
  const { id } = await params

  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const kv = getKVCache(env)
    const db = getSupabaseClient()

    // 檢查權限
    const hasPermission = await checkPermission(kv, db, user.id, 'pos:members:write')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json() as UpdateMemberInput
    const member = await updateMember(db, id, body)

    return NextResponse.json(member)
  } catch (error: unknown) {
    console.error('Error updating member:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * DELETE /api/pos/members/[id] - 刪除會員（軟刪除）
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { env } = await getCloudflareContext()
  const { id } = await params

  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const kv = getKVCache(env)
    const db = getSupabaseClient()

    // 檢查權限
    const hasPermission = await checkPermission(kv, db, user.id, 'pos:members:delete')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await deleteMember(db, id)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting member:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
