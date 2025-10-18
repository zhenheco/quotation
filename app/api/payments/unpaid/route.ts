/**
 * Unpaid Payments API
 * GET /api/payments/unpaid
 * Lists all unpaid payments (>30 days overdue) using the database view
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUnpaidPayments } from '@/lib/services/payments';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);

    const filters = {
      customer_id: searchParams.get('customer_id') || undefined,
      min_days_overdue: searchParams.get('min_days_overdue')
        ? parseInt(searchParams.get('min_days_overdue')!)
        : undefined,
    };

    const unpaidPayments = await getUnpaidPayments(userId, filters);

    // Calculate totals
    const totalAmount = unpaidPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const currencyGroups = unpaidPayments.reduce((acc, p) => {
      if (!acc[p.currency]) {
        acc[p.currency] = 0;
      }
      acc[p.currency] += parseFloat(p.amount);
      return acc;
    }, {} as Record<string, number>);

    // Calculate max days overdue
    const maxDaysOverdue = unpaidPayments.length > 0
      ? Math.max(...unpaidPayments.map(p => p.days_overdue))
      : 0;

    return NextResponse.json({
      success: true,
      data: unpaidPayments,
      count: unpaidPayments.length,
      summary: {
        total_records: unpaidPayments.length,
        total_amount: totalAmount,
        max_days_overdue: maxDaysOverdue,
        by_currency: currencyGroups,
      },
    });
  } catch (error: any) {
    console.error('Get unpaid payments error:', error);

    if (error.message.includes('permissions')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get unpaid payments', message: error.message },
      { status: 500 }
    );
  }
}
