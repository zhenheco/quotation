/**
 * POS 會員餘額操作 API Route
 * Account-system → quotation-system 整合
 */

import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getMemberById, deductMemberBalance, updateMemberSpent } from '@/lib/dal/pos'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/pos/members/[id]/balance - 取得會員餘額
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

    const member = await getMemberById(db, id)

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    return NextResponse.json({
      member_id: member.id,
      member_no: member.member_no,
      name: member.name,
      balance: member.balance,
      points: member.points,
      total_spent: member.total_spent,
      level: member.level,
    })
  } catch (error: unknown) {
    console.error('Error fetching balance:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/**
 * POST /api/pos/members/[id]/balance - 扣除會員餘額 / 更新累計消費
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json() as {
      action: 'deduct' | 'add_spent'
      amount: number
    }

    if (!body.action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json({ error: 'amount must be greater than 0' }, { status: 400 })
    }

    let result
    if (body.action === 'deduct') {
      const newBalance = await deductMemberBalance(db, id, body.amount)
      result = { member_id: id, new_balance: newBalance }
    } else if (body.action === 'add_spent') {
      const member = await updateMemberSpent(db, id, body.amount)
      result = {
        member_id: member.id,
        new_total_spent: member.total_spent,
        level_id: member.level_id,
      }
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "deduct" or "add_spent"' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Error processing balance operation:', error)
    const message = getErrorMessage(error)
    if (message.includes('不存在')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.includes('餘額不足')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
