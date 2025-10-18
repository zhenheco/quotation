/**
 * Update Contract Next Collection API
 * PUT /api/contracts/[id]/next-collection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateNextCollection } from '@/lib/services/contracts';

export async function PUT(
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
    const body = await req.json();

    // Validate required fields
    if (!body.next_collection_date || body.next_collection_amount === undefined) {
      return NextResponse.json(
        { error: 'Next collection date and amount are required' },
        { status: 400 }
      );
    }

    // Validate date format
    const nextDate = new Date(body.next_collection_date);
    if (isNaN(nextDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof body.next_collection_amount !== 'number' || body.next_collection_amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    const contract = await updateNextCollection(userId, contractId, {
      next_collection_date: body.next_collection_date,
      next_collection_amount: body.next_collection_amount,
    });

    return NextResponse.json({
      success: true,
      data: contract,
      message: '下次應收資訊已更新',
    });
  } catch (error: any) {
    console.error('Update next collection error:', error);

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
      { error: 'Failed to update next collection', message: error.message },
      { status: 500 }
    );
  }
}
