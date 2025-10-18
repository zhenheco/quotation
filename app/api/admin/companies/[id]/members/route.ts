import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isSuperAdmin, canAssignRole, getRoleByName } from '@/lib/services/rbac';
import { addCompanyMember } from '@/lib/services/company';
import { query } from '@/lib/db/zeabur';

/**
 * POST /api/admin/companies/[id]/members
 * 超管新增公司成員
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // 驗證用戶
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 檢查是否為超管
    const isAdmin = await isSuperAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    const companyId = params.id;
    const body = await request.json();
    const { user_id, role_name, full_name, display_name, phone } = body;

    // 驗證必填欄位
    if (!user_id || !role_name) {
      return NextResponse.json(
        { error: 'user_id and role_name are required' },
        { status: 400 }
      );
    }

    // 檢查是否可以分配此角色（超管可以分配任何角色）
    const canAssign = await canAssignRole(user.id, role_name, companyId);
    if (!canAssign) {
      return NextResponse.json(
        { error: `Cannot assign role: ${role_name}` },
        { status: 403 }
      );
    }

    // 取得角色
    const role = await getRoleByName(role_name);
    if (!role) {
      return NextResponse.json(
        { error: `Role not found: ${role_name}` },
        { status: 404 }
      );
    }

    // 建立或更新 user profile
    await query(
      `INSERT INTO user_profiles (user_id, full_name, display_name, phone)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE
       SET full_name = COALESCE($2, user_profiles.full_name),
           display_name = COALESCE($3, user_profiles.display_name),
           phone = COALESCE($4, user_profiles.phone)`,
      [user_id, full_name || null, display_name || null, phone || null]
    );

    // 新增到公司
    const member = await addCompanyMember(
      companyId,
      user.id,
      user_id,
      role.id
    );

    return NextResponse.json(member, { status: 201 });

  } catch (error: any) {
    console.error('Error adding company member:', error);

    // 檢查是否為重複新增
    if (error.message?.includes('duplicate') || error.code === '23505') {
      return NextResponse.json(
        { error: 'User is already a member of this company' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add company member' },
      { status: 500 }
    );
  }
}
