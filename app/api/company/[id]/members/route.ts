import { createApiClient } from '@/lib/supabase/api';
import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getCompanyMembersDetailed, addCompanyMember, getCompanyMember } from '@/lib/services/company';
import { canAssignRole, getRoleByName, isSuperAdmin } from '@/lib/services/rbac';
import { RoleName } from '@/types/rbac.types';

interface AddMemberBody {
  user_id: string;
  role_name: string;
  full_name?: string;
  display_name?: string;
  phone?: string;
}

/**
 * GET /api/company/[id]/members
 * 取得公司成員列表
 */
export async function GET(
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

    const { id: companyId } = await params;

    // 取得公司成員（內部會檢查權限）
    const members = await getCompanyMembersDetailed(companyId, user.id);

    return NextResponse.json({
      members
    });

  } catch (error: unknown) {
    console.error('Error fetching company members:', error);

    if (getErrorMessage(error)?.includes('do not have access')) {
      return NextResponse.json(
        { error: 'Forbidden: Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch company members' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/company/[id]/members
 * 新增公司成員（owner 或 super admin）
 */
export async function POST(
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

    const { id: companyId } = await params;
    const body = await request.json() as AddMemberBody;
    const { user_id, role_name, full_name, display_name, phone } = body;

    // 驗證必填欄位
    if (!user_id || !role_name) {
      return NextResponse.json(
        { error: 'user_id and role_name are required' },
        { status: 400 }
      );
    }

    // 檢查是否為超管或公司 owner
    const isAdmin = await isSuperAdmin(user.id);
    const member = await getCompanyMember(companyId, user.id);

    if (!isAdmin && (!member || !member.is_owner)) {
      return NextResponse.json(
        { error: 'Forbidden: Only company owner or super admin can add members' },
        { status: 403 }
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
    const canAssign = await canAssignRole(user.id, role_name as RoleName, companyId);
    if (!canAssign) {
      return NextResponse.json(
        { error: `Cannot assign role: ${role_name}` },
        { status: 403 }
      );
    }

    // 取得角色
    const role = await getRoleByName(role_name as RoleName);
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
        // 不阻止成員新增，繼續執行
      }
    }

    // 新增到公司
    const newMember = await addCompanyMember(
      companyId,
      user.id,
      user_id,
      role.id
    );

    return NextResponse.json(newMember, { status: 201 });

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
