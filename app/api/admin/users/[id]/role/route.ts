import { createApiClient } from '@/lib/supabase/api';
import { NextRequest, NextResponse } from 'next/server';
import { isSuperAdmin, canAssignRole, assignRoleToUser, getRoleByName } from '@/lib/dal/rbac';
import { AssignRoleRequest } from '@/app/api/types';
import { RoleName } from '@/types/rbac.types';
import { getSupabaseClient } from '@/lib/db/supabase-client';

// Note: Edge runtime removed for OpenNext compatibility;

/**
 * PATCH /api/admin/users/[id]/role
 * 更改使用者角色（僅超級管理員）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createApiClient(request);

    // 驗證用戶
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getSupabaseClient();

    // 檢查是否為超管
    const isAdmin = await isSuperAdmin(db, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    const { id: targetUserId } = await params;
    const body = await request.json() as AssignRoleRequest;
    const { role_name, company_id } = body;

    // 驗證必填欄位
    if (!role_name) {
      return NextResponse.json(
        { error: 'role_name is required' },
        { status: 400 }
      );
    }

    // 驗證 role_name 類型
    const validRoles: RoleName[] = ['super_admin', 'company_owner', 'sales_manager', 'salesperson', 'accountant'];
    if (!validRoles.includes(role_name as RoleName)) {
      return NextResponse.json(
        { error: `Invalid role: ${role_name}` },
        { status: 400 }
      );
    }

    // 檢查是否可以分配此角色
    const canAssign = await canAssignRole(db, user.id, role_name as RoleName, company_id);
    if (!canAssign) {
      return NextResponse.json(
        { error: `Cannot assign role: ${role_name}` },
        { status: 403 }
      );
    }

    // 如果是全域角色（super_admin, company_owner），直接分配
    if (['super_admin', 'company_owner'].includes(role_name)) {
      const role = await getRoleByName(db, role_name as RoleName);
      if (!role) {
        return NextResponse.json(
          { error: `Role not found: ${role_name}` },
          { status: 404 }
        );
      }

      await assignRoleToUser(db, targetUserId, role.id, user.id);

      return NextResponse.json({
        message: `Successfully assigned ${role_name} to user`,
        user_id: targetUserId,
        role_name: role_name
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

  } catch (error: unknown) {
    console.error('Error updating user role:', error);

    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}
