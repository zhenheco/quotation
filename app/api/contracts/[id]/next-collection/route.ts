/**
 * Update Contract Next Collection API
 * PUT /api/contracts/[id]/next-collection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { createApiClient } from '@/lib/supabase/api'
import { updateContractNextCollection } from '@/lib/dal/contracts'

interface UpdateNextCollectionRequest {
  next_collection_date: string;
  next_collection_amount: number;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createApiClient(req)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getSupabaseClient()
    const kv = getKVCache()

    const hasPermission = await checkPermission(kv, db, user.id, 'contracts:write')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update contracts' },
        { status: 403 }
      );
    }

    const { id: contractId } = await params;
    const body = await req.json() as UpdateNextCollectionRequest;

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

    const contract = await updateContractNextCollection(db, user.id, contractId, {
      next_collection_date: body.next_collection_date,
      next_collection_amount: body.next_collection_amount,
    });

    return NextResponse.json({
      success: true,
      data: contract,
      message: '下次應收資訊已更新',
    });
  } catch (error: unknown) {
    console.error('Update next collection error:', error);

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
      { error: 'Failed to update next collection', message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
