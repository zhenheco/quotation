import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getD1Client } from '@/lib/db/d1-client'
import { assignRoleToUser, getRoleByName } from '@/lib/dal/rbac'
import { getCloudflareContext } from '@opennextjs/cloudflare'

export async function POST(request: NextRequest) {
  const { env } = await getCloudflareContext()

  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getD1Client(env)

    const superAdminRole = await getRoleByName(db, 'super_admin')

    if (!superAdminRole) {
      return NextResponse.json({ error: 'Super admin role not found' }, { status: 500 })
    }

    await assignRoleToUser(db, user.id, superAdminRole.id)

    return NextResponse.json({
      success: true,
      message: 'Admin permissions assigned',
      userId: user.id,
      roleId: superAdminRole.id
    })
  } catch (error: unknown) {
    console.error('Error initializing permissions:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to initialize permissions'
    }, { status: 500 })
  }
}
