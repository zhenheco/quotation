/**
 * Company Invitations API
 * GET /api/companies/[id]/invitations - 取得公司邀請連結列表
 * POST /api/companies/[id]/invitations - 建立邀請連結
 */

import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { createApiClient } from '@/lib/supabase/api'
import { getCompanyMember } from '@/lib/dal/companies'
import { getCompanyInvitations, createInvitation } from '@/lib/dal/invitations'

interface CreateInvitationRequest {
  role_id: string
  max_uses?: number
  expires_in_days?: number
}

/**
 * GET /api/companies/[id]/invitations
 * 取得公司所有邀請連結
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = await getCloudflareContext()
    const supabase = createApiClient(request)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const db = getSupabaseClient()
    const kv = getKVCache(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'users:read')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view invitations' },
        { status: 403 }
      )
    }

    const { id: companyId } = await params

    const member = await getCompanyMember(db, companyId, user.id)
    if (!member) {
      return NextResponse.json(
        { error: 'You do not have access to this company' },
        { status: 403 }
      )
    }

    // 只有 owner 和 manager 可以查看邀請
    if (!member.is_owner && member.role_name !== 'sales_manager') {
      return NextResponse.json(
        { error: 'Insufficient permissions to view invitations' },
        { status: 403 }
      )
    }

    const invitations = await getCompanyInvitations(db, companyId)

    return NextResponse.json(invitations)
  } catch (error: unknown) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/companies/[id]/invitations
 * 建立新邀請連結
 * Body: { role_id: string, max_uses?: number, expires_in_days?: number }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = await getCloudflareContext()
    const supabase = createApiClient(request)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const db = getSupabaseClient()
    const kv = getKVCache(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'users:write')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create invitations' },
        { status: 403 }
      )
    }

    const { id: companyId } = await params
    const body = await request.json() as CreateInvitationRequest
    const { role_id, max_uses, expires_in_days } = body

    if (!role_id) {
      return NextResponse.json(
        { error: 'role_id is required' },
        { status: 400 }
      )
    }

    const member = await getCompanyMember(db, companyId, user.id)
    if (!member) {
      return NextResponse.json(
        { error: 'You do not have access to this company' },
        { status: 403 }
      )
    }

    // 只有 owner 和 manager 可以建立邀請
    if (!member.is_owner && member.role_name !== 'sales_manager') {
      return NextResponse.json(
        { error: 'Insufficient permissions to create invitations' },
        { status: 403 }
      )
    }

    const invitation = await createInvitation(db, {
      company_id: companyId,
      role_id,
      created_by: user.id,
      max_uses: max_uses ?? 1,
      expires_in_days: expires_in_days ?? 7,
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quote24.cc'
    const inviteUrl = `${appUrl}/zh/invite/${invitation.invite_code}`

    return NextResponse.json({
      invitation,
      invite_url: inviteUrl,
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating invitation:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
