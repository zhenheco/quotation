/**
 * Mark Payment as Overdue API
 * POST /api/payments/[id]/mark-overdue
 * Manually mark a payment schedule as overdue
 */

import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { createApiClient } from '@/lib/supabase/api'
import { markPaymentScheduleAsOverdue } from '@/lib/dal/payments';

// Note: Edge runtime removed for OpenNext compatibility

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = await getCloudflareContext()
    const supabase = createApiClient(req)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getSupabaseClient()
    const kv = getKVCache(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'payments:write')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update payment schedule' },
        { status: 403 }
      );
    }

    const { id: scheduleId } = await params;

    const schedule = await markPaymentScheduleAsOverdue(db, user.id, scheduleId);

    if (!schedule) {
      return NextResponse.json(
        { error: 'Payment schedule not found or already processed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: schedule,
      message: '付款排程已標記為逾期',
    });
  } catch (error: unknown) {
    console.error('Mark payment as overdue error:', error);

    if (getErrorMessage(error).includes('permissions')) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 403 }
      );
    }

    if (getErrorMessage(error).includes('not found') || getErrorMessage(error).includes('already processed')) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to mark payment as overdue', message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
