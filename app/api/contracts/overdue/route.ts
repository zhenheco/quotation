/**
 * Get Contracts with Overdue Payments API
 * GET /api/contracts/overdue
 */

import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
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
  } catch (error: unknown) {
    console.error('Get overdue contracts error:', error);

    if (getErrorMessage(error).includes('permissions')) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get overdue contracts', message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
