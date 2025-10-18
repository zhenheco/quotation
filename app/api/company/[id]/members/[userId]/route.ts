import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  updateCompanyMemberRole,
  removeCompanyMember,
  getCompanyMember
} from '@/lib/services/company';
import { canAssignRole, getRoleByName, isSuperAdmin } from '@/lib/services/rbac';

/**
 * PATCH /api/company/[id]/members/[userId]
 * 更新公司成員角色
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
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

    const companyId = params.id;
    const targetUserId = params.userId;
    const body = await request.json();
    const { role_name } = body;

    // 驗證必填欄位
    if (!role_name) {
      return NextResponse.json(
        { error: 'role_name is required' },
        { status: 400 }
      );
    }

    // 檢查是否為超管或公司 owner
    const isAdmin = await isSuperAdmin(user.id);
    const member = await getCompanyMember(companyId, user.id);

    if (!isAdmin && (!member || !member.is_owner)) {
      return NextResponse.json(
        { error: 'Forbidden: Only company owner or super admin can update members' },
        { status: 403 }
      );
    }

    // 檢查是否可以分配此角色
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

    // 更新成員角色
    const updatedMember = await updateCompanyMemberRole(
      companyId,
      user.id,
      targetUserId,
      role.id
    );

    return NextResponse.json(updatedMember);

  } catch (error: any) {
    console.error('Error updating company member:', error);

    if (error.message?.includes('Cannot change owner')) {
      return NextResponse.json(
        { error: 'Cannot change owner role' },
        { status: 403 }
      );
    }

    if (error.message?.includes('Insufficient permissions')) {
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
  { params }: { params: { id: string; userId: string } }
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

    const companyId = params.id;
    const targetUserId = params.userId;

    // 檢查是否為超管或公司 owner
    const isAdmin = await isSuperAdmin(user.id);
    const member = await getCompanyMember(companyId, user.id);

    if (!isAdmin && (!member || !member.is_owner)) {
      return NextResponse.json(
        { error: 'Forbidden: Only company owner or super admin can remove members' },
        { status: 403 }
      );
    }

    // 移除成員
    await removeCompanyMember(companyId, user.id, targetUserId);

    return NextResponse.json({
      message: 'Member removed successfully'
    });

  } catch (error: any) {
    console.error('Error removing company member:', error);

    if (error.message?.includes('Cannot remove owner')) {
      return NextResponse.json(
        { error: 'Cannot remove company owner' },
        { status: 403 }
      );
    }

    if (error.message?.includes('Insufficient permissions')) {
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
