/**
 * Get Contract Payment Progress API
 * GET /api/contracts/[id]/payment-progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { createApiClient } from '@/lib/supabase/api'
import { getContractPaymentProgress } from '@/lib/dal/contracts';

export const runtime = 'edge'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const hasPermission = await checkPermission(kv, db, user.id, 'contracts:read')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view contracts' },
        { status: 403 }
      );
    }

    const { id: contractId } = await params;

    const progress = await getContractPaymentProgress(db, user.id, contractId);

    if (!progress) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      );
    }

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
