/**
 * Get Contracts with Overdue Payments API
 * GET /api/contracts/overdue
 */

import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getServerSession } from '@/lib/auth';
import { getContractsWithOverduePayments } from '@/lib/services/contracts';

export async function GET() {
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
        error: 'Failed to get overdue contracts',
        message: getErrorMessage(error),
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        rawError: String(error)
      },
      { status: 500 }
    );
  }
}
