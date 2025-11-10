import { NextRequest, NextResponse } from 'next/server';
import { updatePaymentStatus } from '@/lib/services/payment-terms';
import { createClient } from '@/lib/supabase/server';

/**
 * PATCH /api/quotations/[id]/payment-terms/[termId]/status
 * 更新付款狀態
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; termId: string }> }
) {
  try {
    const { termId } = await params;
    const { paid_amount, paid_date } = await request.json();

    if (typeof paid_amount !== 'number' || paid_amount < 0) {
      return NextResponse.json(
        { error: '付款金額參數錯誤' },
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

    // @ts-expect-error - quotations 是 inner join
    if (term.quotations.user_id !== user.id) {
      return NextResponse.json(
        { error: '無權限更新付款狀態' },
        { status: 403 }
      );
    }

    const updatedTerm = await updatePaymentStatus(
      termId,
      paid_amount,
      paid_date
    );

    return NextResponse.json(updatedTerm);
  } catch (error) {
    console.error('更新付款狀態失敗:', error);
    return NextResponse.json(
      { error: '更新付款狀態失敗' },
      { status: 500 }
    );
  }
}
