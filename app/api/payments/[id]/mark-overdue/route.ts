/**
 * Mark Payment as Overdue API
 * POST /api/payments/[id]/mark-overdue
 * Manually mark a payment schedule as overdue
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { markPaymentAsOverdue } from '@/lib/services/payments';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const scheduleId = params.id;

    const schedule = await markPaymentAsOverdue(userId, scheduleId);

    return NextResponse.json({
      success: true,
      data: schedule,
      message: '付款排程已標記為逾期',
    });
  } catch (error: any) {
    console.error('Mark payment as overdue error:', error);

    if (error.message.includes('permissions')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (error.message.includes('not found') || error.message.includes('already processed')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to mark payment as overdue', message: error.message },
      { status: 500 }
    );
  }
}
