import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { hasPermission } from '@/lib/dal/rbac'
import { getSupabaseClient } from '@/lib/db/supabase-client'

// Note: Edge runtime removed for OpenNext compatibility

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

    const body = await request.json() as Record<string, unknown>
    const { resource, action } = body

    if (!resource || !action) {
      return NextResponse.json(
        { error: 'Resource and action are required' },
        { status: 400 }
      )
    }

    const db = getSupabaseClient()

    // 使用 DAL 的 hasPermission 函數進行權限檢查
    const permissionName = `${resource}:${action}`
    const hasPerms = await hasPermission(
      db,
      user.id,
      permissionName
    )

    return NextResponse.json({
      hasPermission: hasPerms,
      resource,
      action,
      userId: user.id
    })
  } catch (error: unknown) {
    console.error('Error checking permission:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
