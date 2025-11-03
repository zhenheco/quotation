import type { Database } from '@/types/database.types';

type PaymentTerm = Database['public']['Tables']['payment_terms']['Row'];

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

  if (paidAmount >= term.amount) {
    return 'paid';
  }

  if (paidAmount > 0) {
    return 'partial';
  }

  if (term.due_date) {
    const dueDate = new Date(term.due_date);
    if (currentDate > dueDate) {
      return 'overdue';
    }
  }

  return 'unpaid';
}
