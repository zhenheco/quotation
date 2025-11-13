/**
 * Payment Reminders API
 * GET /api/payments/reminders
 * Lists next collection reminders using the database view
 */

import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { createApiClient } from '@/lib/supabase/api'
import { getPaymentReminders } from '@/lib/dal/payments';

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
        { error: 'Insufficient permissions to view payment reminders' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);

    const daysAhead = searchParams.get('days_ahead')
      ? parseInt(searchParams.get('days_ahead')!)
      : 30;
    const statusFilter = searchParams.get('status') as 'overdue' | 'due_today' | 'due_soon' | 'upcoming' | undefined;

    let reminders = await getPaymentReminders(db, user.id, daysAhead);

    if (statusFilter) {
      reminders = reminders.filter(r => r.collection_status === statusFilter);
    }

    interface Reminder {
      collection_status: string;
      currency: string;
      next_collection_amount: string | number;
    }

    const groupedByStatus = reminders.reduce<Record<string, Reminder[]>>((acc, r) => {
      const reminder = r as Reminder;
      const status = reminder.collection_status || 'unknown';
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(reminder);
      return acc;
    }, {});

    const totalAmount = reminders.reduce((sum: number, r) => {
      const reminder = r as Reminder;
      const amount = reminder.next_collection_amount ? parseFloat(String(reminder.next_collection_amount)) : 0;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const currencyGroups = reminders.reduce<Record<string, number>>((acc, r) => {
      const reminder = r as Reminder;
      const currency = reminder.currency || 'TWD';
      if (!acc[currency]) {
        acc[currency] = 0;
      }
      const amount = reminder.next_collection_amount ? parseFloat(String(reminder.next_collection_amount)) : 0;
      acc[currency] += isNaN(amount) ? 0 : amount;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: reminders,
      count: reminders.length,
      summary: {
        total_records: reminders.length,
        total_amount: totalAmount,
        by_currency: currencyGroups,
        by_status: {
          overdue: groupedByStatus.overdue?.length || 0,
          due_today: groupedByStatus.due_today?.length || 0,
          due_soon: groupedByStatus.due_soon?.length || 0,
          upcoming: groupedByStatus.upcoming?.length || 0,
        },
      },
      grouped: groupedByStatus,
    });
  } catch (error: unknown) {
    console.error('Get payment reminders error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error?.constructor?.name);

    if (getErrorMessage(error).includes('permissions')) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to get payment reminders',
        message: getErrorMessage(error),
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        rawError: String(error)
      },
      { status: 500 }
    );
  }
}
