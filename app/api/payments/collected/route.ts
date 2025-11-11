/**
 * Collected Payments API
 * GET /api/payments/collected
 * Lists all collected (confirmed) payments using the database view
 */

import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
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

    interface PaymentRecord {
      amount: string | number;
      currency: string;
    }

    const totalAmount = payments.reduce((sum: number, p) => {
      const payment = p as PaymentRecord;
      const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount;
      return sum + amount;
    }, 0);
    const currencyGroups = payments.reduce<Record<string, number>>((acc, p) => {
      const payment = p as PaymentRecord;
      const currency = payment.currency || 'UNKNOWN';
      if (!acc[currency]) {
        acc[currency] = 0;
      }
      const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount;
      acc[currency] += amount;
      return acc;
    }, {});

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
  } catch (error: unknown) {
    console.error('Get collected payments error:', error);

    if (getErrorMessage(error).includes('permissions')) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get collected payments', message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
