import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isSuperAdmin, canAssignRole, assignRoleToUser, removeRoleFromUser } from '@/lib/services/rbac';

/**
 * PATCH /api/admin/users/[id]/role
 * 更改使用者角色（僅超級管理員）
 */
export async function PATCH(
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

    const targetUserId = params.id;
    const body = await request.json();
    const { role_name, company_id } = body;

    // 驗證必填欄位
    if (!role_name) {
      return NextResponse.json(
        { error: 'role_name is required' },
        { status: 400 }
      );
    }

    // 檢查是否可以分配此角色
    const canAssign = await canAssignRole(user.id, role_name, company_id);
    if (!canAssign) {
      return NextResponse.json(
        { error: `Cannot assign role: ${role_name}` },
        { status: 403 }
      );
    }

    // 如果是全域角色（super_admin, company_owner），直接分配
    if (['super_admin', 'company_owner'].includes(role_name)) {
      const userRole = await assignRoleToUser(targetUserId, role_name, user.id);

      return NextResponse.json({
        message: `Successfully assigned ${role_name} to user`,
        user_role: userRole
      });
    }

    // 如果是公司角色，需要透過 company_members 表處理
    if (company_id) {
      // 這部分應該使用 company API，而非直接在這裡處理
      return NextResponse.json(
        { error: 'Company role changes should use /api/company/[id]/members/[userId] endpoint' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid role assignment request' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Error updating user role:', error);

    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}
