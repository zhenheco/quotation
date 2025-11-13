import { NextRequest, NextResponse } from 'next/server';
import { updatePaymentTerm, deletePaymentTerm } from '@/lib/dal/payment-terms';
import { createApiClient } from '@/lib/supabase/api';
import { getD1Client } from '@/lib/db/d1-client';
import { getKVCache } from '@/lib/cache/kv-cache';
import { checkPermission } from '@/lib/cache/services';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getErrorMessage } from '@/app/api/utils/error-handler';

export const runtime = 'edge';

/**
 * PUT /api/quotations/[id]/payment-terms/[termId]
 * 更新付款條款
 */
interface UpdatePaymentTermBody {
  term_name?: string;
  percentage?: number;
  amount?: number;
  due_date?: string | null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; termId: string }> }
) {
  try {
    const { termId } = await params;
    const { env } = await getCloudflareContext();
    const supabase = createApiClient(request);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getD1Client(env);
    const kv = getKVCache(env);

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:write');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update payment terms' },
        { status: 403 }
      );
    }

    const updates = await request.json() as UpdatePaymentTermBody;

    const updatedTerm = await updatePaymentTerm(db, user.id, termId, updates);

    return NextResponse.json(updatedTerm);
  } catch (error) {
    console.error('更新付款條款失敗:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) || '更新付款條款失敗' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/quotations/[id]/payment-terms/[termId]
 * 刪除付款條款
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; termId: string }> }
) {
  try {
    const { termId } = await params;
    const { env } = await getCloudflareContext();
    const supabase = createApiClient(request);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getD1Client(env);
    const kv = getKVCache(env);

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:delete');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete payment terms' },
        { status: 403 }
      );
    }

    await deletePaymentTerm(db, user.id, termId);

    return NextResponse.json(null, { status: 204 });
  } catch (error) {
    console.error('刪除付款條款失敗:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) || '刪除付款條款失敗' },
      { status: 500 }
    );
  }
}
