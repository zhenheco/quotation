import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'

export const dynamic = 'force-dynamic'

/**
 * POST /api/rbac/check-permission
 * Check if user has permission for a specific action on a resource
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { resource, action } = body

    if (!resource || !action) {
      return NextResponse.json(
        { error: 'Resource and action are required' },
        { status: 400 }
      )
    }

    // 簡單的權限檢查：已登入用戶有基本權限
    // 可以根據需求擴充更複雜的 RBAC 邏輯
    const hasPermission = true

    return NextResponse.json({
      hasPermission,
      resource,
      action,
      userId: user.id
    })
  } catch (error: unknown) {
    console.error('Error checking permission:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
