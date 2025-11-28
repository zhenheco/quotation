import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { assignRoleToUser, getRoleByName } from '@/lib/dal/rbac'

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getSupabaseClient()

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
