import { createApiClient } from '@/lib/supabase/api';
import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { isSuperAdmin, canAssignRole, getRoleByName } from '@/lib/dal/rbac';
import { addCompanyMember, getCompanyMember } from '@/lib/dal/companies';
import { AddCompanyMemberRequest } from '@/app/api/types';
import { RoleName } from '@/types/rbac.types';
import { getD1Client } from '@/lib/db/d1-client';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Note: Edge runtime removed for OpenNext compatibility;

/**
 * POST /api/admin/companies/[id]/members
 * 超管新增公司成員
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // 檢查是否為超管
    const isAdmin = await isSuperAdmin(db, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required' },
        { status: 403 }
      );
    }

    const { id: companyId } = await params;
    const body = await request.json() as AddCompanyMemberRequest;
    const { user_id, role_name, full_name, display_name, phone } = body;

    // 驗證必填欄位
    if (!user_id || !role_name) {
      return NextResponse.json(
        { error: 'user_id and role_name are required' },
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

    // 檢查是否可以分配此角色（超管可以分配任何角色）
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

    // 建立或更新 user metadata (使用 Supabase Auth)
    if (full_name || display_name || phone) {
      const updates: Record<string, string> = {};
      if (full_name) updates.full_name = full_name;
      if (display_name) updates.display_name = display_name;
      if (phone) updates.phone = phone;

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user_id,
        { user_metadata: updates }
      );

      if (updateError) {
        console.warn('Failed to update user metadata:', updateError);
      }
    }

    // 新增到公司
    await addCompanyMember(db, companyId, user_id, role.id);

    // 取得新增的成員資料
    const member = await getCompanyMember(db, companyId, user_id);

    return NextResponse.json(member, { status: 201 });

  } catch (error: unknown) {
    console.error('Error adding company member:', error);

    // 檢查是否為重複新增
    const errorMessage = getErrorMessage(error);
    const isDuplicate = errorMessage?.includes('duplicate') ||
                       (error && typeof error === 'object' && 'code' in error && error.code === '23505');

    if (isDuplicate) {
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
