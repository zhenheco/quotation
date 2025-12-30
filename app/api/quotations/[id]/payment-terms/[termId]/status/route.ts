import { NextRequest, NextResponse } from 'next/server';
import { updatePaymentStatus } from '@/lib/dal/payment-terms';
import { createApiClient } from '@/lib/supabase/api';
import { getSupabaseClient } from '@/lib/db/supabase-client';
import { getKVCache } from '@/lib/cache/kv-cache';
import { checkPermission } from '@/lib/cache/services';
import { getErrorMessage } from '@/app/api/utils/error-handler';

interface UpdatePaymentStatusBody {
  paid_amount: number;
  paid_date?: string;
}

/**
 * PATCH /api/quotations/[id]/payment-terms/[termId]/status
 * 更新付款狀態
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; termId: string }> }
) {
  try {
    const { termId } = await params;
    const supabase = createApiClient(request);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getSupabaseClient();
    const kv = getKVCache();

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:write');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update payment status' },
        { status: 403 }
      );
    }

    const { paid_amount, paid_date } = await request.json() as UpdatePaymentStatusBody;

    if (typeof paid_amount !== 'number' || paid_amount < 0) {
      return NextResponse.json(
        { error: '付款金額參數錯誤' },
        { status: 400 }
      );
    }

    const updatedTerm = await updatePaymentStatus(
      db,
      user.id,
      termId,
      paid_amount,
      paid_date
    );

    return NextResponse.json(updatedTerm);
  } catch (error) {
    console.error('更新付款狀態失敗:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) || '更新付款狀態失敗' },
      { status: 500 }
    );
  }
}
