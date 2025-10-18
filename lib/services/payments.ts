/**
 * Payments Service
 * Handles payment tracking for quotations and contracts
 */

import { pool } from '../db/zeabur';
import type {
  Payment,
  PaymentFormData,
  PaymentWithRelations,
  PaymentSummary,
} from '@/types/extended.types';
import { hasPermission } from './rbac';
import { markScheduleAsPaid, updateCustomerNextPayment } from './contracts';

// ============================================================================
// PAYMENTS
// ============================================================================

export async function getPayments(
  userId: string,
  filters?: {
    customer_id?: string;
    quotation_id?: string;
    contract_id?: string;
    status?: string;
    payment_type?: string;
  }
): Promise<PaymentWithRelations[]> {
  // Check permission
  const canRead = await hasPermission(userId, 'payments', 'read');
  if (!canRead) {
    throw new Error('Insufficient permissions to view payments');
  }

  let query = `
    SELECT
      p.*,
      json_build_object(
        'id', c.id,
        'company_name_zh', c.company_name_zh,
        'company_name_en', c.company_name_en
      ) as customer,
      json_build_object(
        'id', q.id,
        'quotation_number', q.quotation_number,
        'total', q.total
      ) as quotation,
      json_build_object(
        'id', ct.id,
        'contract_number', ct.contract_number,
        'total_amount', ct.total_amount
      ) as contract
    FROM payments p
    JOIN customers c ON p.customer_id = c.id
    LEFT JOIN quotations q ON p.quotation_id = q.id
    LEFT JOIN customer_contracts ct ON p.contract_id = ct.id
    WHERE p.user_id = $1
  `;

  const params: any[] = [userId];
  let paramIndex = 2;

  if (filters?.customer_id) {
    query += ` AND p.customer_id = $${paramIndex}`;
    params.push(filters.customer_id);
    paramIndex++;
  }

  if (filters?.quotation_id) {
    query += ` AND p.quotation_id = $${paramIndex}`;
    params.push(filters.quotation_id);
    paramIndex++;
  }

  if (filters?.contract_id) {
    query += ` AND p.contract_id = $${paramIndex}`;
    params.push(filters.contract_id);
    paramIndex++;
  }

  if (filters?.status) {
    query += ` AND p.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters?.payment_type) {
    query += ` AND p.payment_type = $${paramIndex}`;
    params.push(filters.payment_type);
    paramIndex++;
  }

  query += ` ORDER BY p.payment_date DESC`;

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getPaymentById(
  paymentId: string,
  userId: string
): Promise<PaymentWithRelations | null> {
  const result = await pool.query(
    `SELECT
       p.*,
       json_build_object(
         'id', c.id,
         'company_name_zh', c.company_name_zh,
         'company_name_en', c.company_name_en
       ) as customer,
       json_build_object(
         'id', q.id,
         'quotation_number', q.quotation_number,
         'total', q.total
       ) as quotation,
       json_build_object(
         'id', ct.id,
         'contract_number', ct.contract_number,
         'total_amount', ct.total_amount
       ) as contract
     FROM payments p
     JOIN customers c ON p.customer_id = c.id
     LEFT JOIN quotations q ON p.quotation_id = q.id
     LEFT JOIN customer_contracts ct ON p.contract_id = ct.id
     WHERE p.id = $1 AND p.user_id = $2`,
    [paymentId, userId]
  );

  return result.rows[0] || null;
}

export async function createPayment(
  userId: string,
  data: PaymentFormData
): Promise<Payment> {
  // Check permission
  const canWrite = await hasPermission(userId, 'payments', 'write');
  if (!canWrite) {
    throw new Error('Insufficient permissions to create payment');
  }

  // Validate that either quotation_id or contract_id is provided
  if (!data.quotation_id && !data.contract_id) {
    throw new Error('Either quotation_id or contract_id must be provided');
  }

  const result = await pool.query(
    `INSERT INTO payments (
       user_id,
       quotation_id,
       contract_id,
       customer_id,
       payment_type,
       payment_date,
       amount,
       currency,
       payment_method,
       reference_number,
       notes,
       status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'confirmed')
     RETURNING *`,
    [
      userId,
      data.quotation_id || null,
      data.contract_id || null,
      data.customer_id,
      data.payment_type,
      data.payment_date,
      data.amount,
      data.currency,
      data.payment_method || null,
      data.reference_number || null,
      data.notes || null,
    ]
  );

  const payment = result.rows[0];

  // If this is a contract payment, try to match with payment schedule
  if (data.contract_id) {
    await matchPaymentToSchedule(payment.id, data.contract_id, data.payment_date, userId);
    await updateCustomerNextPayment(data.customer_id, userId);
  }

  // Update quotation payment status (handled by trigger)
  // Update customer next payment (if applicable)

  return payment;
}

export async function updatePayment(
  paymentId: string,
  userId: string,
  data: Partial<PaymentFormData> & { status?: string }
): Promise<Payment> {
  // Check permission
  const canWrite = await hasPermission(userId, 'payments', 'write');
  if (!canWrite) {
    throw new Error('Insufficient permissions to update payment');
  }

  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  Object.entries(data).forEach(([key, value]) => {
    fields.push(`${key} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  });

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(paymentId, userId);

  const result = await pool.query(
    `UPDATE payments
     SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('Payment not found');
  }

  return result.rows[0];
}

export async function deletePayment(
  paymentId: string,
  userId: string
): Promise<void> {
  // Check permission
  const canDelete = await hasPermission(userId, 'payments', 'delete');
  if (!canDelete) {
    throw new Error('Insufficient permissions to delete payment');
  }

  const result = await pool.query(
    `DELETE FROM payments
     WHERE id = $1 AND user_id = $2
     RETURNING customer_id`,
    [paymentId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Payment not found');
  }

  const customerId = result.rows[0].customer_id;
  await updateCustomerNextPayment(customerId, userId);
}

export async function updatePaymentReceipt(
  paymentId: string,
  userId: string,
  receiptUrl: string
): Promise<Payment> {
  return await updatePayment(paymentId, userId, { receipt_url: receiptUrl } as any);
}

// ============================================================================
// PAYMENT SUMMARY & ANALYTICS
// ============================================================================

export async function getPaymentSummary(
  userId: string,
  currency: string = 'TWD'
): Promise<PaymentSummary> {
  // Total paid (confirmed payments)
  const paidResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM payments
     WHERE user_id = $1 AND currency = $2 AND status = 'confirmed'`,
    [userId, currency]
  );

  // Total pending (pending payment schedules)
  const pendingResult = await pool.query(
    `SELECT COALESCE(SUM(amount - paid_amount), 0) as total
     FROM payment_schedules
     WHERE user_id = $1 AND currency = $2 AND status = 'pending'`,
    [userId, currency]
  );

  // Total overdue (overdue payment schedules)
  const overdueResult = await pool.query(
    `SELECT COALESCE(SUM(amount - paid_amount), 0) as total
     FROM payment_schedules
     WHERE user_id = $1 AND currency = $2 AND status = 'overdue'`,
    [userId, currency]
  );

  return {
    total_paid: parseFloat(paidResult.rows[0].total),
    total_pending: parseFloat(pendingResult.rows[0].total),
    total_overdue: parseFloat(overdueResult.rows[0].total),
    currency,
  };
}

export async function getPaymentsByMonth(
  userId: string,
  year: number,
  currency: string = 'TWD'
): Promise<{ month: number; total: number }[]> {
  const result = await pool.query(
    `SELECT
       EXTRACT(MONTH FROM payment_date) as month,
       SUM(amount) as total
     FROM payments
     WHERE user_id = $1
       AND EXTRACT(YEAR FROM payment_date) = $2
       AND currency = $3
       AND status = 'confirmed'
     GROUP BY EXTRACT(MONTH FROM payment_date)
     ORDER BY month`,
    [userId, year, currency]
  );

  return result.rows.map((row) => ({
    month: parseInt(row.month),
    total: parseFloat(row.total),
  }));
}

export async function getPaymentsByCustomer(
  userId: string,
  limit: number = 10
): Promise<{ customer_id: string; customer_name: string; total: number }[]> {
  const result = await pool.query(
    `SELECT
       c.id as customer_id,
       c.company_name_zh as customer_name,
       SUM(p.amount) as total
     FROM payments p
     JOIN customers c ON p.customer_id = c.id
     WHERE p.user_id = $1 AND p.status = 'confirmed'
     GROUP BY c.id, c.company_name_zh
     ORDER BY total DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows.map((row) => ({
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    total: parseFloat(row.total),
  }));
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function matchPaymentToSchedule(
  paymentId: string,
  contractId: string,
  paymentDate: string,
  userId: string
): Promise<void> {
  // Find the most recent pending payment schedule for this contract
  const result = await pool.query(
    `SELECT * FROM payment_schedules
     WHERE contract_id = $1 AND user_id = $2 AND status = 'pending'
     ORDER BY due_date ASC
     LIMIT 1`,
    [contractId, userId]
  );

  if (result.rows.length > 0) {
    const schedule = result.rows[0];
    await markScheduleAsPaid(schedule.id, userId, paymentId, paymentDate);
  }
}

export async function calculateOutstandingBalance(
  quotationId?: string,
  contractId?: string
): Promise<number> {
  if (quotationId) {
    const result = await pool.query(
      `SELECT total, total_paid FROM quotations WHERE id = $1`,
      [quotationId]
    );

    if (result.rows.length === 0) {
      return 0;
    }

    const { total, total_paid } = result.rows[0];
    return total - (total_paid || 0);
  }

  if (contractId) {
    const result = await pool.query(
      `SELECT
         cc.total_amount,
         COALESCE(SUM(p.amount), 0) as total_paid
       FROM customer_contracts cc
       LEFT JOIN payments p ON cc.id = p.contract_id AND p.status = 'confirmed'
       WHERE cc.id = $1
       GROUP BY cc.id, cc.total_amount`,
      [contractId]
    );

    if (result.rows.length === 0) {
      return 0;
    }

    const { total_amount, total_paid } = result.rows[0];
    return total_amount - parseFloat(total_paid);
  }

  return 0;
}

// ============================================================================
// PAYMENT REMINDERS
// ============================================================================

export async function getCustomersNeedingPaymentReminder(
  userId: string,
  daysBeforeDue: number = 7
): Promise<any[]> {
  const result = await pool.query(
    `SELECT
       c.*,
       ps.due_date,
       ps.amount,
       ps.currency,
       ps.due_date - CURRENT_DATE as days_until_due
     FROM customers c
     JOIN payment_schedules ps ON c.id = ps.customer_id
     WHERE c.user_id = $1
       AND ps.status = 'pending'
       AND ps.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + $2
     ORDER BY ps.due_date ASC`,
    [userId, daysBeforeDue]
  );

  return result.rows;
}

export async function checkOverduePayments(userId: string): Promise<void> {
  // This function can be called by a cron job to automatically mark overdue payments
  await pool.query(
    `UPDATE payment_schedules
     SET status = 'overdue'
     WHERE user_id = $1
       AND status = 'pending'
       AND due_date < CURRENT_DATE`,
    [userId]
  );

  // Also update quotations payment status
  await pool.query(
    `UPDATE quotations q
     SET payment_status = 'overdue'
     WHERE user_id = $1
       AND payment_status IN ('unpaid', 'partial')
       AND payment_due_date < CURRENT_DATE`,
    [userId]
  );
}
