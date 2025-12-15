/**
 * POS 會員 API Routes
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
  getMembers,
  getMemberByPhone,
  getMemberByNo,
  createMember,
  getMemberLevels,
} from '@/lib/dal/pos'
import type { CreateMemberInput } from '@/lib/dal/pos'

/**
 * GET /api/pos/members - 取得會員列表
 */
export async function GET(request: NextRequest) {
  const { env } = await getCloudflareContext()

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

    // 解析查詢參數
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenant_id')
    const search = searchParams.get('search')
    const levelId = searchParams.get('level_id')
    const isActiveStr = searchParams.get('is_active')
    const phone = searchParams.get('phone')
    const memberNo = searchParams.get('member_no')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 })
    }

    // 取得會員等級列表
    const levels = searchParams.get('levels') === 'true'
    if (levels) {
      const levelList = await getMemberLevels(db, tenantId)
      return NextResponse.json(levelList)
    }

    // 根據電話查詢單一會員
    if (phone) {
      const member = await getMemberByPhone(db, tenantId, phone)
      return NextResponse.json(member)
    }

    // 根據會員編號查詢單一會員
    if (memberNo) {
      const member = await getMemberByNo(db, tenantId, memberNo)
      return NextResponse.json(member)
    }

    const members = await getMembers(db, {
      tenantId,
      search: search || undefined,
      levelId: levelId || undefined,
      isActive: isActiveStr === null ? undefined : isActiveStr === 'true',
      limit,
      offset,
    })

    const response = NextResponse.json(members)
    response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60')
    return response
  } catch (error: unknown) {
    console.error('Error fetching members:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * POST /api/pos/members - 建立新會員
 */
export async function POST(request: NextRequest) {
  const { env } = await getCloudflareContext()

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

    const body = await request.json() as CreateMemberInput

    // 驗證必要欄位
    if (!body.tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 })
    }
    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    if (!body.phone) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 })
    }

    const member = await createMember(db, body)

    return NextResponse.json(member, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating member:', error)
    const message = getErrorMessage(error)
    if (message.includes('已被註冊')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
