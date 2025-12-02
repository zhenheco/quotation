/**
 * Single Invitation API
 * DELETE /api/companies/[id]/invitations/[invitationId] - 撤銷邀請連結
 */

import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { createApiClient } from '@/lib/supabase/api'
import { getCompanyMember } from '@/lib/dal/companies'
import { revokeInvitation } from '@/lib/dal/invitations'

/**
 * DELETE /api/companies/[id]/invitations/[invitationId]
 * 撤銷邀請連結
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; invitationId: string }> }
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
        { error: 'Insufficient permissions to revoke invitations' },
        { status: 403 }
      )
    }

    const { id: companyId, invitationId } = await params

    const member = await getCompanyMember(db, companyId, user.id)
    if (!member) {
      return NextResponse.json(
        { error: 'You do not have access to this company' },
        { status: 403 }
      )
    }

    // 只有 owner 和 manager 可以撤銷邀請
    if (!member.is_owner && member.role_name !== 'sales_manager') {
      return NextResponse.json(
        { error: 'Insufficient permissions to revoke invitations' },
        { status: 403 }
      )
    }

    await revokeInvitation(db, invitationId)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error revoking invitation:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
