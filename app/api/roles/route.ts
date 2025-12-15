import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api'
import { getErrorMessage } from '@/app/api/utils/error-handler'

/**
 * GET /api/roles
 * 取得所有角色列表
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: roles, error } = await supabase
      .from('roles')
      .select('id, name, name_zh, name_en')
      .order('name')

    if (error) {
      // 若 roles 資料表不存在，返回空陣列而非錯誤
      if (error.code === '42P01') {
        return NextResponse.json([])
      }
      throw error
    }

    // 轉換格式以符合前端期望的 display_name 結構
    const transformedRoles = (roles || []).map(role => ({
      id: role.id,
      name: role.name,
      display_name: {
        zh: role.name_zh || role.name,
        en: role.name_en || role.name
      }
    }))

    return NextResponse.json(transformedRoles)
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
