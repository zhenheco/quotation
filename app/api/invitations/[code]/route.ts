/**
 * Public Invitation Validation API
 * GET /api/invitations/[code] - 驗證邀請碼（公開，無需登入）
 */

import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { validateInvitation } from '@/lib/dal/invitations'

/**
 * GET /api/invitations/[code]
 * 驗證邀請碼是否有效（公開 API）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    if (!code || code.length !== 32) {
      return NextResponse.json(
        { valid: false, error: 'INVALID_CODE_FORMAT' },
        { status: 400 }
      )
    }

    const db = getSupabaseClient()
    const result = await validateInvitation(db, code)

    if (!result.valid) {
      return NextResponse.json({
        valid: false,
        error: result.error,
      })
    }

    // 返回有限的資訊（不包含敏感資料）
    return NextResponse.json({
      valid: true,
      company: result.invitation?.company,
      role: result.invitation?.role,
    })
  } catch (error: unknown) {
    console.error('Error validating invitation:', error)
    return NextResponse.json(
      { valid: false, error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
