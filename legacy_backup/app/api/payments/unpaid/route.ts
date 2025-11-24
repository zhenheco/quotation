/**
 * Unpaid Payments API
 * GET /api/payments/unpaid
 * Lists all unpaid payments (>30 days overdue) using the database view
 */

import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { createApiClient } from '@/lib/supabase/api'
import { getUnpaidPaymentSchedules } from '@/lib/dal/payments';

// Note: Edge runtime removed for OpenNext compatibility

export async function GET(req: NextRequest) {
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

    const db = getD1Client(env)
    const kv = getKVCache(env)

    const hasPermission = await checkPermission(kv, db, user.id, 'payments:read')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view unpaid payments' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);

    const filters = {
      customer_id: searchParams.get('customer_id') || undefined,
      min_days_overdue: searchParams.get('min_days_overdue')
        ? parseInt(searchParams.get('min_days_overdue')!)
        : undefined,
    };

    const unpaidPayments = await getUnpaidPaymentSchedules(db, user.id, filters);

    interface UnpaidPayment {
      amount: string | number;
      currency: string;
      days_overdue: number;
    }

    const totalAmount = unpaidPayments.reduce((sum: number, p) => {
      const payment = p as UnpaidPayment;
      const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount;
      return sum + amount;
    }, 0);
    const currencyGroups = unpaidPayments.reduce((acc: Record<string, number>, p) => {
      const payment = p as UnpaidPayment;
      const currency = payment.currency || 'UNKNOWN';
      if (!acc[currency]) {
        acc[currency] = 0;
      }
      const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount;
      acc[currency] += amount;
      return acc;
    }, {} as Record<string, number>);

    const maxDaysOverdue = unpaidPayments.length > 0
      ? Math.max(...unpaidPayments.map((p) => (p as UnpaidPayment).days_overdue))
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
  } catch (error: unknown) {
    console.error('Get unpaid payments error:', error);

    if (getErrorMessage(error).includes('permissions')) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get unpaid payments', message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
