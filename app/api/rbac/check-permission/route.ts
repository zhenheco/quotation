import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { checkPermission } from '@/lib/dal/rbac'
import { getD1Client } from '@/lib/db/d1-client'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { PermissionResource, PermissionAction } from '@/types/rbac.types'

export const runtime = 'edge'

/**
 * POST /api/rbac/check-permission
 * Check if user has permission for a specific action on a resource
 */
export async function POST(request: NextRequest) {
  const { env } = await getCloudflareContext()

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

    const db = getD1Client(env)

    // 使用 DAL 的 checkPermission 函數進行權限檢查
    const hasPermission = await checkPermission(
      db,
      user.id,
      resource as PermissionResource,
      action as PermissionAction
    )

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
