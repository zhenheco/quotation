/**
 * Get Contracts with Overdue Payments API
 * GET /api/contracts/overdue
 */

import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { createApiClient } from '@/lib/supabase/api'
import { getContractsWithOverduePayments } from '@/lib/dal/contracts';

export const runtime = 'edge'

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

    const hasPermission = await checkPermission(kv, db, user.id, 'contracts:read')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view contracts' },
        { status: 403 }
      );
    }

    const contracts = await getContractsWithOverduePayments(db, user.id);

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
