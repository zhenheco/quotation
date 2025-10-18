/**
 * Collected Payments API
 * GET /api/payments/collected
 * Lists all collected (confirmed) payments using the database view
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { getCollectedPayments } from '@/lib/services/payments';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();

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
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      payment_type: searchParams.get('payment_type') || undefined,
    };

    const payments = await getCollectedPayments(userId, filters);

    // Calculate totals
    const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const currencyGroups = payments.reduce((acc, p) => {
      if (!acc[p.currency]) {
        acc[p.currency] = 0;
      }
      acc[p.currency] += parseFloat(p.amount);
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      data: payments,
      count: payments.length,
      summary: {
        total_records: payments.length,
        total_amount: totalAmount,
        by_currency: currencyGroups,
      },
    });
  } catch (error: any) {
    console.error('Get collected payments error:', error);

    if (error.message.includes('permissions')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get collected payments', message: error.message },
      { status: 500 }
    );
  }
}
