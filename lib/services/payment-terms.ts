import { createClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PaymentTerm = any; // Database type placeholder
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PaymentTermInsert = any; // Database type placeholder
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PaymentTermUpdate = any; // Database type placeholder

/**
 * 計算付款條款金額
 * @param percentage - 付款百分比 (0-100)
 * @param total - 報價單總金額
 * @returns 計算後的金額
 */
export function calculateTermAmount(percentage: number, total: number): number {
  if (percentage < 0 || percentage > 100) {
    throw new Error('百分比必須在 0-100 之間');
  }
  if (total < 0) {
    throw new Error('總金額必須大於等於 0');
  }
  return Math.round((percentage / 100) * total * 100) / 100;
}

/**
 * 驗證付款條款百分比總和
 * @param terms - 付款條款陣列
 * @returns 驗證結果
 */
export function validatePercentages(terms: Pick<PaymentTerm, 'percentage'>[]): {
  isValid: boolean;
  sum: number;
  warning?: string;
} {
  const sum = terms.reduce((acc, term) => acc + term.percentage, 0);
  const roundedSum = Math.round(sum * 100) / 100;

  if (roundedSum === 100) {
    return { isValid: true, sum: roundedSum };
  }

  const warning =
    roundedSum < 100
      ? `付款百分比總和為 ${roundedSum}%，未達 100%`
      : `付款百分比總和為 ${roundedSum}%，超過 100%`;

  return { isValid: true, sum: roundedSum, warning };
}

/**
 * 判斷付款狀態
 * @param term - 付款條款
 * @param currentDate - 當前日期
 * @returns 付款狀態
 */
export function determinePaymentStatus(
  term: Pick<PaymentTerm, 'amount' | 'paid_amount' | 'due_date'>,
  currentDate: Date = new Date()
): 'unpaid' | 'partial' | 'paid' | 'overdue' {
  const paidAmount = term.paid_amount || 0;

  // 已付款
  if (paidAmount >= term.amount) {
    return 'paid';
  }

  // 部分付款
  if (paidAmount > 0) {
    return 'partial';
  }

  // 檢查是否逾期
  if (term.due_date) {
    const dueDate = new Date(term.due_date);
    if (currentDate > dueDate) {
      return 'overdue';
    }
  }

  return 'unpaid';
}

/**
 * 重新計算所有付款條款金額
 * @param quotationId - 報價單 ID
 * @param newTotal - 新的報價單總金額
 */
export async function recalculateAllTerms(
  quotationId: string,
  newTotal: number
): Promise<void> {
  const supabase = await createClient();

  // 取得所有付款條款
  const { data: terms, error: fetchError } = await supabase
    .from('payment_terms')
    .select('*')
    .eq('quotation_id', quotationId)
    .order('term_number');

  if (fetchError) {
    throw new Error(`取得付款條款失敗: ${fetchError.message}`);
  }

  if (!terms || terms.length === 0) {
    return;
  }

  // 重新計算每一期的金額
  const updates = terms.map((term) => ({
    id: term.id,
    amount: calculateTermAmount(term.percentage, newTotal),
  }));

  // 批次更新
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('payment_terms')
      .update({ amount: update.amount })
      .eq('id', update.id);

    if (updateError) {
      throw new Error(`更新付款條款失敗: ${updateError.message}`);
    }
  }
}

/**
 * 建立付款條款
 * @param term - 付款條款資料
 */
export async function createPaymentTerm(
  term: PaymentTermInsert
): Promise<PaymentTerm> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payment_terms')
    .insert(term)
    .select()
    .single();

  if (error) {
    throw new Error(`建立付款條款失敗: ${error.message}`);
  }

  return data;
}

/**
 * 取得報價單的所有付款條款
 * @param quotationId - 報價單 ID
 */
export async function getPaymentTerms(
  quotationId: string
): Promise<PaymentTerm[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payment_terms')
    .select('*')
    .eq('quotation_id', quotationId)
    .order('term_number');

  if (error) {
    throw new Error(`取得付款條款失敗: ${error.message}`);
  }

  return data || [];
}

/**
 * 更新付款條款
 * @param termId - 付款條款 ID
 * @param updates - 更新資料
 */
export async function updatePaymentTerm(
  termId: string,
  updates: PaymentTermUpdate
): Promise<PaymentTerm> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payment_terms')
    .update(updates)
    .eq('id', termId)
    .select()
    .single();

  if (error) {
    throw new Error(`更新付款條款失敗: ${error.message}`);
  }

  return data;
}

/**
 * 刪除付款條款
 * @param termId - 付款條款 ID
 */
export async function deletePaymentTerm(termId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('payment_terms')
    .delete()
    .eq('id', termId);

  if (error) {
    throw new Error(`刪除付款條款失敗: ${error.message}`);
  }
}

/**
 * 更新付款狀態
 * @param termId - 付款條款 ID
 * @param paidAmount - 實際付款金額
 * @param paidDate - 實際付款日期
 */
export async function updatePaymentStatus(
  termId: string,
  paidAmount: number,
  paidDate?: string
): Promise<PaymentTerm> {
  const supabase = await createClient();

  // 取得付款條款
  const { data: term, error: fetchError } = await supabase
    .from('payment_terms')
    .select('*')
    .eq('id', termId)
    .single();

  if (fetchError) {
    throw new Error(`取得付款條款失敗: ${fetchError.message}`);
  }

  // 判斷付款狀態
  const status = determinePaymentStatus(
    {
      amount: term.amount,
      paid_amount: paidAmount,
      due_date: term.due_date,
    },
    paidDate ? new Date(paidDate) : new Date()
  );

  // 更新付款資訊
  const { data, error } = await supabase
    .from('payment_terms')
    .update({
      paid_amount: paidAmount,
      paid_date: paidDate || new Date().toISOString().split('T')[0],
      payment_status: status,
    })
    .eq('id', termId)
    .select()
    .single();

  if (error) {
    throw new Error(`更新付款狀態失敗: ${error.message}`);
  }

  return data;
}

/**
 * 批次建立付款條款
 * @param quotationId - 報價單 ID
 * @param terms - 付款條款陣列
 * @param total - 報價單總金額
 */
export async function batchCreatePaymentTerms(
  quotationId: string,
  terms: Array<{
    term_number: number;
    percentage: number;
    due_date?: string | null;
    description?: { zh: string; en: string };
  }>,
  total: number
): Promise<PaymentTerm[]> {
  const supabase = await createClient();

  // 驗證百分比
  const validation = validatePercentages(terms);
  if (validation.warning) {
    console.warn(validation.warning);
  }

  // 建立付款條款
  const insertData: PaymentTermInsert[] = terms.map((term) => ({
    quotation_id: quotationId,
    term_number: term.term_number,
    percentage: term.percentage,
    amount: calculateTermAmount(term.percentage, total),
    due_date: term.due_date,
    description: term.description,
  }));

  const { data, error } = await supabase
    .from('payment_terms')
    .insert(insertData)
    .select();

  if (error) {
    throw new Error(`批次建立付款條款失敗: ${error.message}`);
  }

  return data;
}

/**
 * 自動檢查並更新逾期狀態
 */
export async function updateOverdueStatus(): Promise<number> {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  // 找出所有逾期的付款條款
  const { data: overdueTerms, error: fetchError } = await supabase
    .from('payment_terms')
    .select('*')
    .lt('due_date', today)
    .in('payment_status', ['unpaid', 'partial']);

  if (fetchError) {
    throw new Error(`取得逾期付款條款失敗: ${fetchError.message}`);
  }

  if (!overdueTerms || overdueTerms.length === 0) {
    return 0;
  }

  // 批次更新為逾期狀態
  for (const term of overdueTerms) {
    await supabase
      .from('payment_terms')
      .update({ payment_status: 'overdue' })
      .eq('id', term.id);
  }

  return overdueTerms.length;
}
