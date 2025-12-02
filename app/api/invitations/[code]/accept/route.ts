/**
 * Accept Invitation API
 * POST /api/invitations/[code]/accept - 接受邀請加入公司
 */

import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { createApiClient } from '@/lib/supabase/api'
import { acceptInvitation } from '@/lib/dal/invitations'

/**
 * POST /api/invitations/[code]/accept
 * 接受邀請加入公司（需要登入）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const supabase = createApiClient(request)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { code } = await params

    if (!code || code.length !== 32) {
      return NextResponse.json(
        { success: false, error: 'INVALID_CODE_FORMAT' },
        { status: 400 }
      )
    }

    const db = getSupabaseClient()
    const result = await acceptInvitation(db, code, user.id)

    if (!result.success) {
      const statusCode = result.error === 'ALREADY_MEMBER' ? 409 : 400
      return NextResponse.json(
        { success: false, error: result.error },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      company_id: result.company_id,
    })
  } catch (error: unknown) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
