/**
 * Get Contract Payment Progress API
 * GET /api/contracts/[id]/payment-progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getContractPaymentProgress } from '@/lib/services/contracts';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const contractId = params.id;

    const progress = await getContractPaymentProgress(userId, contractId);

    return NextResponse.json({
      success: true,
      data: progress,
    });
  } catch (error: any) {
    console.error('Get contract payment progress error:', error);

    if (error.message.includes('permissions')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get payment progress', message: error.message },
      { status: 500 }
    );
  }
}
