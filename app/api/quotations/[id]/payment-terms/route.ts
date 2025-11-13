import { NextRequest, NextResponse } from 'next/server';
import { getPaymentTerms, batchCreatePaymentTerms } from '@/lib/dal/payment-terms';
import { createApiClient } from '@/lib/supabase/api';
import { getD1Client } from '@/lib/db/d1-client';
import { getKVCache } from '@/lib/cache/kv-cache';
import { checkPermission } from '@/lib/cache/services';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getErrorMessage } from '@/app/api/utils/error-handler';

// Note: Edge runtime removed for OpenNext compatibility;

/**
 * GET /api/quotations/[id]/payment-terms
 * 取得報價單的所有付款條款
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { env } = await getCloudflareContext();
    const supabase = createApiClient(request);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getD1Client(env);
    const kv = getKVCache(env);

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:read');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view payment terms' },
        { status: 403 }
      );
    }

    const terms = await getPaymentTerms(db, user.id, id);

    return NextResponse.json(terms);
  } catch (error) {
    console.error('取得付款條款失敗:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) || '取得付款條款失敗' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quotations/[id]/payment-terms
 * 批次建立付款條款
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { env } = await getCloudflareContext();
    const supabase = createApiClient(request);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getD1Client(env);
    const kv = getKVCache(env);

    const hasPermission = await checkPermission(kv, db, user.id, 'quotations:write');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create payment terms' },
        { status: 403 }
      );
    }

    const body = await request.json() as Record<string, unknown>;
    const { terms, total } = body;

    if (!Array.isArray(terms) || typeof total !== 'number') {
      return NextResponse.json(
        { error: '請求參數錯誤' },
        { status: 400 }
      );
    }

    const createdTerms = await batchCreatePaymentTerms(db, user.id, id, terms, total);

    return NextResponse.json(createdTerms, { status: 201 });
  } catch (error) {
    console.error('建立付款條款失敗:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) || '建立付款條款失敗' },
      { status: 500 }
    );
  }
}
