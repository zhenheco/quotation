/**
 * Payment Reminders API
 * GET /api/payments/reminders
 * Lists next collection reminders using the database view
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getNextCollectionReminders } from '@/lib/services/payments';

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
      days_ahead: searchParams.get('days_ahead')
        ? parseInt(searchParams.get('days_ahead')!)
        : 30,
      status: searchParams.get('status') as 'overdue' | 'due_today' | 'due_soon' | 'upcoming' | undefined,
    };

    const reminders = await getNextCollectionReminders(userId, filters);

    // Group by status
    const groupedByStatus = reminders.reduce((acc, r) => {
      const status = r.collection_status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(r);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate totals
    const totalAmount = reminders.reduce((sum, r) => sum + parseFloat(r.next_collection_amount), 0);
    const currencyGroups = reminders.reduce((acc, r) => {
      if (!acc[r.currency]) {
        acc[r.currency] = 0;
      }
      acc[r.currency] += parseFloat(r.next_collection_amount);
      return acc;
    }, {} as Record<string, number>);

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
  } catch (error: any) {
    console.error('Get payment reminders error:', error);

    if (error.message.includes('permissions')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get payment reminders', message: error.message },
      { status: 500 }
    );
  }
}
