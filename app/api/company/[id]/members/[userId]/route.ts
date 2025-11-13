import { createApiClient } from '@/lib/supabase/api';
import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import {
  updateCompanyMemberRole,
  removeCompanyMember,
  getCompanyMember
} from '@/lib/dal/companies';
import { canAssignRole, getRoleByName, isSuperAdmin } from '@/lib/dal/rbac';
import { RoleName } from '@/types/rbac.types';
import { getD1Client } from '@/lib/db/d1-client';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'edge';

interface UpdateMemberRoleBody {
  role_name: string;
}

/**
 * PATCH /api/company/[id]/members/[userId]
 * 更新公司成員角色
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { env } = await getCloudflareContext();

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

    const db = getD1Client(env);
    const { id: companyId, userId: targetUserId } = await params;
    const body = await request.json() as UpdateMemberRoleBody;
    const { role_name } = body;

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

    // 檢查是否為超管或公司 owner
    const isAdmin = await isSuperAdmin(db, user.id);
    const member = await getCompanyMember(db, companyId, user.id);

    if (!isAdmin && (!member || member.is_owner !== 1)) {
      return NextResponse.json(
        { error: 'Forbidden: Only company owner or super admin can update members' },
        { status: 403 }
      );
    }

    // 檢查是否可以分配此角色
    const canAssign = await canAssignRole(db, user.id, role_name as RoleName, companyId);
    if (!canAssign) {
      return NextResponse.json(
        { error: `Cannot assign role: ${role_name}` },
        { status: 403 }
      );
    }

    // 取得角色
    const role = await getRoleByName(db, role_name as RoleName);
    if (!role) {
      return NextResponse.json(
        { error: `Role not found: ${role_name}` },
        { status: 404 }
      );
    }

    // 更新成員角色
    const updatedMember = await updateCompanyMemberRole(
      db,
      companyId,
      targetUserId,
      role.id
    );

    return NextResponse.json(updatedMember);

  } catch (error: unknown) {
    console.error('Error updating company member:', error);

    if (getErrorMessage(error)?.includes('Cannot change owner')) {
      return NextResponse.json(
        { error: 'Cannot change owner role' },
        { status: 403 }
      );
    }

    if (getErrorMessage(error)?.includes('Insufficient permissions')) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update company member' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/company/[id]/members/[userId]
 * 移除公司成員（停用）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { env } = await getCloudflareContext();

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

    const db = getD1Client(env);
    const { id: companyId, userId: targetUserId } = await params;

    // 檢查是否為超管或公司 owner
    const isAdmin = await isSuperAdmin(db, user.id);
    const member = await getCompanyMember(db, companyId, user.id);

    if (!isAdmin && (!member || member.is_owner !== 1)) {
      return NextResponse.json(
        { error: 'Forbidden: Only company owner or super admin can remove members' },
        { status: 403 }
      );
    }

    // 移除成員
    await removeCompanyMember(db, companyId, targetUserId);

    return NextResponse.json({
      message: 'Member removed successfully'
    });

  } catch (error: unknown) {
    console.error('Error removing company member:', error);

    if (getErrorMessage(error)?.includes('Cannot remove owner')) {
      return NextResponse.json(
        { error: 'Cannot remove company owner' },
        { status: 403 }
      );
    }

    if (getErrorMessage(error)?.includes('Insufficient permissions')) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to remove company member' },
      { status: 500 }
    );
  }
}
