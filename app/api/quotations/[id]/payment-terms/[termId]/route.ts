import { NextRequest, NextResponse } from 'next/server';
import {
  updatePaymentTerm,
  deletePaymentTerm,
} from '@/lib/services/payment-terms';
import { createClient } from '@/lib/supabase/server';

/**
 * PUT /api/quotations/[id]/payment-terms/[termId]
 * 更新付款條款
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; termId: string }> }
) {
  try {
    const { termId } = await params;
    const updates = await request.json();

    // 驗證用戶權限
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: '未授權' },
        { status: 401 }
      );
    }

    // 驗證付款條款是否存在且用戶有權限
    const { data: term, error: termError } = await supabase
      .from('payment_terms')
      .select('*, quotations!inner(user_id)')
      .eq('id', termId)
      .single();

    if (termError || !term) {
      return NextResponse.json(
        { error: '付款條款不存在' },
        { status: 404 }
      );
    }

    // @ts-ignore - quotations 是 inner join
    if (term.quotations.user_id !== user.id) {
      return NextResponse.json(
        { error: '無權限編輯此付款條款' },
        { status: 403 }
      );
    }

    const updatedTerm = await updatePaymentTerm(termId, updates);

    return NextResponse.json(updatedTerm);
  } catch (error) {
    console.error('更新付款條款失敗:', error);
    return NextResponse.json(
      { error: '更新付款條款失敗' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/quotations/[id]/payment-terms/[termId]
 * 刪除付款條款
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; termId: string }> }
) {
  try {
    const { termId } = await params;

    // 驗證用戶權限
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: '未授權' },
        { status: 401 }
      );
    }

    // 驗證付款條款是否存在且用戶有權限
    const { data: term, error: termError } = await supabase
      .from('payment_terms')
      .select('*, quotations!inner(user_id)')
      .eq('id', termId)
      .single();

    if (termError || !term) {
      return NextResponse.json(
        { error: '付款條款不存在' },
        { status: 404 }
      );
    }

    // @ts-ignore - quotations 是 inner join
    if (term.quotations.user_id !== user.id) {
      return NextResponse.json(
        { error: '無權限刪除此付款條款' },
        { status: 403 }
      );
    }

    await deletePaymentTerm(termId);

    return NextResponse.json(null, { status: 204 });
  } catch (error) {
    console.error('刪除付款條款失敗:', error);
    return NextResponse.json(
      { error: '刪除付款條款失敗' },
      { status: 500 }
    );
  }
}
