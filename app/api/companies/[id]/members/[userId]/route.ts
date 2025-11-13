/**
 * Company Member Management API
 * PUT /api/companies/[id]/members/[userId] - 更新成員角色
 * DELETE /api/companies/[id]/members/[userId] - 移除成員
 */

import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { createApiClient } from '@/lib/supabase/api'
import { updateCompanyMemberRole, removeCompanyMember, getCompanyMember } from '@/lib/dal/companies'

export const runtime = 'edge'

interface UpdateMemberRoleRequest {
  role_id: string;
}

/**
 * PUT /api/companies/[id]/members/[userId]
 * 更新成員角色
 * Body: { role_id: string }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { env } = await getCloudflareContext()
    const supabase = createApiClient(request)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getD1Client(env)
    const kv = getKVCache(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'users:write')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update member roles' },
        { status: 403 }
      );
    }

    const { id: companyId, userId: targetUserId } = await params
    const body = await request.json() as UpdateMemberRoleRequest
    const { role_id } = body

    if (!role_id) {
      return NextResponse.json(
        { error: 'role_id is required' },
        { status: 400 }
      );
    }

    const currentMember = await getCompanyMember(db, companyId, user.id)
    if (!currentMember || !currentMember.is_owner) {
      return NextResponse.json(
        { error: 'Only company owner can update member roles' },
        { status: 403 }
      );
    }

    const targetMember = await getCompanyMember(db, companyId, targetUserId)
    if (targetMember?.is_owner) {
      return NextResponse.json(
        { error: 'Cannot change owner\'s role' },
        { status: 403 }
      );
    }

    const updatedMember = await updateCompanyMemberRole(db, companyId, targetUserId, role_id)

    return NextResponse.json(updatedMember);
  } catch (error: unknown) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/companies/[id]/members/[userId]
 * 移除成員
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { env } = await getCloudflareContext()
    const supabase = createApiClient(request)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getD1Client(env)
    const kv = getKVCache(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'users:delete')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to remove members' },
        { status: 403 }
      );
    }

    const { id: companyId, userId: targetUserId } = await params

    const currentMember = await getCompanyMember(db, companyId, user.id)
    if (!currentMember || !currentMember.is_owner) {
      return NextResponse.json(
        { error: 'Only company owner can remove members' },
        { status: 403 }
      );
    }

    const targetMember = await getCompanyMember(db, companyId, targetUserId)
    if (targetMember?.is_owner) {
      return NextResponse.json(
        { error: 'Cannot remove company owner' },
        { status: 403 }
      );
    }

    await removeCompanyMember(db, companyId, targetUserId)

    return NextResponse.json({
      message: 'Member removed successfully'
    });
  } catch (error: unknown) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
