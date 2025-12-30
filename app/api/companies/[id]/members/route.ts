/**
 * Company Members API
 * GET /api/companies/[id]/members - 取得公司成員列表
 * POST /api/companies/[id]/members - 新增公司成員
 */

import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { createApiClient } from '@/lib/supabase/api'
import { getCompanyMembers, addCompanyMember, isCompanyMember, getCompanyMember } from '@/lib/dal/companies'

interface AddMemberRequest {
  user_id: string;
  role_id: string;
}

/**
 * GET /api/companies/[id]/members
 * 取得公司所有成員
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createApiClient(request)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getSupabaseClient()
    const kv = getKVCache()

    const hasPermission = await checkPermission(kv, db, user.id, 'companies:read')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view company members' },
        { status: 403 }
      );
    }

    const { id: companyId } = await params

    const isMember = await isCompanyMember(db, companyId, user.id)
    if (!isMember) {
      return NextResponse.json(
        { error: 'You do not have access to this company' },
        { status: 403 }
      );
    }

    const members = await getCompanyMembers(db, companyId)

    return NextResponse.json(members);
  } catch (error: unknown) {
    console.error('Error fetching company members:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/companies/[id]/members
 * 新增公司成員
 * Body: { user_id: string, role_id: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createApiClient(request)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getSupabaseClient()
    const kv = getKVCache()

    const hasPermission = await checkPermission(kv, db, user.id, 'users:write')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to add company members' },
        { status: 403 }
      );
    }

    const { id: companyId } = await params
    const body = await request.json() as AddMemberRequest;
    const { user_id, role_id } = body;

    if (!user_id || !role_id) {
      return NextResponse.json(
        { error: 'user_id and role_id are required' },
        { status: 400 }
      );
    }

    const member = await getCompanyMember(db, companyId, user.id)
    if (!member || !member.is_owner) {
      return NextResponse.json(
        { error: 'Only company owner can add members' },
        { status: 403 }
      );
    }

    await addCompanyMember(db, companyId, user_id, role_id)

    const newMember = await getCompanyMember(db, companyId, user_id)

    return NextResponse.json(newMember, { status: 201 });
  } catch (error: unknown) {
    console.error('Error adding company member:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
