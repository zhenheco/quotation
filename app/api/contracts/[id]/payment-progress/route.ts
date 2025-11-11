/**
 * Get Contract Payment Progress API
 * GET /api/contracts/[id]/payment-progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getServerSession } from '@/lib/auth';
import { getContractPaymentProgress } from '@/lib/services/contracts';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { id: contractId } = await params;

    const progress = await getContractPaymentProgress(userId, contractId);

    return NextResponse.json({
      success: true,
      data: progress,
    });
  } catch (error: unknown) {
    console.error('Get contract payment progress error:', error);

    if (getErrorMessage(error).includes('permissions')) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 403 }
      );
    }

    if (getErrorMessage(error).includes('not found')) {
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get payment progress', message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
