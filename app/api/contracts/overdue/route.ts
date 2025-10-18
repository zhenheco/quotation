/**
 * Get Contracts with Overdue Payments API
 * GET /api/contracts/overdue
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { getContractsWithOverduePayments } from '@/lib/services/contracts';

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

    const contracts = await getContractsWithOverduePayments(userId);

    return NextResponse.json({
      success: true,
      data: contracts,
      count: contracts.length,
    });
  } catch (error: any) {
    console.error('Get overdue contracts error:', error);

    if (error.message.includes('permissions')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get overdue contracts', message: error.message },
      { status: 500 }
    );
  }
}
