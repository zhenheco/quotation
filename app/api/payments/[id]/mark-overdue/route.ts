/**
 * Mark Payment as Overdue API
 * POST /api/payments/[id]/mark-overdue
 * Manually mark a payment schedule as overdue
 */

import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getServerSession } from '@/lib/auth';
import { markPaymentAsOverdue } from '@/lib/services/payments';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { id: scheduleId } = await params;

    const schedule = await markPaymentAsOverdue(userId, scheduleId);

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
