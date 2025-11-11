import { NextRequest, NextResponse } from 'next/server';
import {
  getPaymentTerms,
  batchCreatePaymentTerms,
} from '@/lib/services/payment-terms';
import { createClient } from '@/lib/supabase/server';

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

    const terms = await getPaymentTerms(id);

    return NextResponse.json(terms);
  } catch (error) {
    console.error('取得付款條款失敗:', error);
    return NextResponse.json(
      { error: '取得付款條款失敗' },
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
    const body = await request.json() as Record<string, unknown>;

    const { terms, total } = body;

    if (!Array.isArray(terms) || typeof total !== 'number') {
      return NextResponse.json(
        { error: '請求參數錯誤' },
        { status: 400 }
      );
    }

    // 驗證用戶權限
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: '未授權' },
        { status: 401 }
      );
    }

    // 驗證報價單是否存在且屬於該用戶
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (quotationError || !quotation) {
      return NextResponse.json(
        { error: '報價單不存在或無權限' },
        { status: 404 }
      );
    }

    const createdTerms = await batchCreatePaymentTerms(id, terms, total);

    return NextResponse.json(createdTerms, { status: 201 });
  } catch (error) {
    console.error('建立付款條款失敗:', error);
    return NextResponse.json(
      { error: '建立付款條款失敗' },
      { status: 500 }
    );
  }
}
