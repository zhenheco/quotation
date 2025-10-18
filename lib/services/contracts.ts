/**
 * Customer Contracts Service
 * Handles customer contract management and payment schedules
 */

import { pool } from '../db/zeabur';
import type {
  CustomerContract,
  CustomerContractFormData,
  CustomerContractWithCustomer,
  PaymentSchedule,
  PaymentScheduleWithDetails,
  PaymentTerms,
} from '@/types/extended.types';
import { hasPermission } from './rbac';

// ============================================================================
// CONTRACTS
// ============================================================================

export async function getContracts(
  userId: string,
  filters?: {
    customer_id?: string;
    status?: string;
  }
): Promise<CustomerContractWithCustomer[]> {
  // Check permission
  const canRead = await hasPermission(userId, 'contracts', 'read');
  if (!canRead) {
    throw new Error('Insufficient permissions to view contracts');
  }

  let query = `
    SELECT
      cc.*,
      json_build_object(
        'id', c.id,
        'company_name_zh', c.company_name_zh,
        'company_name_en', c.company_name_en,
        'contact_person', c.contact_person
      ) as customer
    FROM customer_contracts cc
    JOIN customers c ON cc.customer_id = c.id
    WHERE cc.user_id = $1
  `;

  const params: any[] = [userId];
  let paramIndex = 2;

  if (filters?.customer_id) {
    query += ` AND cc.customer_id = $${paramIndex}`;
    params.push(filters.customer_id);
    paramIndex++;
  }

  if (filters?.status) {
    query += ` AND cc.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  query += ` ORDER BY cc.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getContractById(
  contractId: string,
  userId: string
): Promise<CustomerContractWithCustomer | null> {
  // Check permission
  const canRead = await hasPermission(userId, 'contracts', 'read');
  if (!canRead) {
    throw new Error('Insufficient permissions to view contract');
  }

  const result = await pool.query(
    `SELECT
       cc.*,
       json_build_object(
         'id', c.id,
         'company_name_zh', c.company_name_zh,
         'company_name_en', c.company_name_en,
         'contact_person', c.contact_person
       ) as customer
     FROM customer_contracts cc
     JOIN customers c ON cc.customer_id = c.id
     WHERE cc.id = $1 AND cc.user_id = $2`,
    [contractId, userId]
  );

  return result.rows[0] || null;
}

export async function createContract(
  userId: string,
  data: CustomerContractFormData
): Promise<CustomerContract> {
  // Check permission
  const canWrite = await hasPermission(userId, 'contracts', 'write');
  if (!canWrite) {
    throw new Error('Insufficient permissions to create contract');
  }

  // Generate contract number
  const contractNumber = await generateContractNumber(userId);

  const result = await pool.query(
    `INSERT INTO customer_contracts (
       user_id,
       customer_id,
       contract_number,
       title,
       start_date,
       end_date,
       signed_date,
       total_amount,
       currency,
       payment_terms,
       notes,
       terms_and_conditions,
       status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
     RETURNING *`,
    [
      userId,
      data.customer_id,
      contractNumber,
      data.title,
      data.start_date,
      data.end_date,
      data.signed_date || null,
      data.total_amount,
      data.currency,
      data.payment_terms || null,
      data.notes || null,
      data.terms_and_conditions || null,
    ]
  );

  const contract = result.rows[0];

  // Update customer contract status
  await pool.query(
    `UPDATE customers
     SET contract_status = 'contracted',
         contract_expiry_date = $1,
         payment_terms = $2
     WHERE id = $3`,
    [data.end_date, data.payment_terms, data.customer_id]
  );

  // Generate payment schedule if payment terms are specified
  if (data.payment_terms) {
    await generatePaymentSchedule(userId, contract.id, data.customer_id, {
      start_date: data.start_date,
      end_date: data.end_date,
      total_amount: data.total_amount,
      currency: data.currency,
      payment_terms: data.payment_terms,
    });
  }

  return contract;
}

export async function updateContract(
  contractId: string,
  userId: string,
  data: Partial<CustomerContractFormData> & { status?: string }
): Promise<CustomerContract> {
  // Check permission
  const canWrite = await hasPermission(userId, 'contracts', 'write');
  if (!canWrite) {
    throw new Error('Insufficient permissions to update contract');
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

  values.push(contractId, userId);

  const result = await pool.query(
    `UPDATE customer_contracts
     SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('Contract not found');
  }

  return result.rows[0];
}

export async function deleteContract(
  contractId: string,
  userId: string
): Promise<void> {
  // Check permission
  const canDelete = await hasPermission(userId, 'contracts', 'delete');
  if (!canDelete) {
    throw new Error('Insufficient permissions to delete contract');
  }

  const result = await pool.query(
    `DELETE FROM customer_contracts
     WHERE id = $1 AND user_id = $2
     RETURNING customer_id`,
    [contractId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Contract not found');
  }

  // Update customer status
  const customerId = result.rows[0].customer_id;
  await pool.query(
    `UPDATE customers
     SET contract_status = 'prospect',
         contract_expiry_date = NULL,
         payment_terms = NULL
     WHERE id = $1`,
    [customerId]
  );
}

export async function updateContractFile(
  contractId: string,
  userId: string,
  fileUrl: string
): Promise<CustomerContract> {
  return await updateContract(contractId, userId, { contract_file_url: fileUrl } as any);
}

// ============================================================================
// PAYMENT SCHEDULES
// ============================================================================

export async function generatePaymentSchedule(
  userId: string,
  contractId: string,
  customerId: string,
  params: {
    start_date: string;
    end_date: string;
    total_amount: number;
    currency: string;
    payment_terms: PaymentTerms;
  }
): Promise<PaymentSchedule[]> {
  const { start_date, total_amount, currency, payment_terms } = params;

  const schedules: PaymentSchedule[] = [];

  // Calculate number of payments and amount per payment
  let numberOfPayments: number;
  let intervalMonths: number;

  switch (payment_terms) {
    case 'quarterly':
      numberOfPayments = 4;
      intervalMonths = 3;
      break;
    case 'semi_annual':
      numberOfPayments = 2;
      intervalMonths = 6;
      break;
    case 'annual':
      numberOfPayments = 1;
      intervalMonths = 12;
      break;
    default:
      throw new Error('Invalid payment terms');
  }

  const amountPerPayment = total_amount / numberOfPayments;

  // Generate payment schedules
  const startDate = new Date(start_date);

  for (let i = 0; i < numberOfPayments; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i * intervalMonths);

    // Set payment day to the 5th of the month (or company default)
    dueDate.setDate(5);

    const result = await pool.query(
      `INSERT INTO payment_schedules (
         user_id,
         contract_id,
         customer_id,
         schedule_number,
         due_date,
         amount,
         currency,
         status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [
        userId,
        contractId,
        customerId,
        i + 1,
        dueDate.toISOString().split('T')[0],
        amountPerPayment,
        currency,
      ]
    );

    schedules.push(result.rows[0]);
  }

  // Update customer next payment info
  if (schedules.length > 0) {
    await pool.query(
      `UPDATE customers
       SET next_payment_due_date = $1,
           next_payment_amount = $2,
           payment_currency = $3
       WHERE id = $4`,
      [schedules[0].due_date, schedules[0].amount, schedules[0].currency, customerId]
    );
  }

  return schedules;
}

export async function getPaymentSchedules(
  userId: string,
  contractId?: string
): Promise<PaymentScheduleWithDetails[]> {
  let query = `
    SELECT
      ps.*,
      json_build_object(
        'id', c.id,
        'company_name_zh', c.company_name_zh,
        'company_name_en', c.company_name_en,
        'contact_person', c.contact_person
      ) as customer,
      json_build_object(
        'id', cc.id,
        'contract_number', cc.contract_number,
        'title', cc.title
      ) as contract,
      CASE
        WHEN ps.status = 'overdue' THEN CURRENT_DATE - ps.due_date
        ELSE NULL
      END as days_overdue,
      CASE
        WHEN ps.status = 'pending' THEN ps.due_date - CURRENT_DATE
        ELSE NULL
      END as days_until_due
    FROM payment_schedules ps
    JOIN customers c ON ps.customer_id = c.id
    JOIN customer_contracts cc ON ps.contract_id = cc.id
    WHERE ps.user_id = $1
  `;

  const params: any[] = [userId];

  if (contractId) {
    query += ` AND ps.contract_id = $2`;
    params.push(contractId);
  }

  query += ` ORDER BY ps.due_date ASC`;

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getOverduePayments(userId: string): Promise<PaymentScheduleWithDetails[]> {
  const result = await pool.query(
    `SELECT * FROM overdue_payments WHERE user_id = $1 ORDER BY days_overdue DESC`,
    [userId]
  );

  return result.rows;
}

export async function getUpcomingPayments(userId: string): Promise<PaymentScheduleWithDetails[]> {
  const result = await pool.query(
    `SELECT * FROM upcoming_payments WHERE user_id = $1 ORDER BY days_until_due ASC`,
    [userId]
  );

  return result.rows;
}

export async function markScheduleAsPaid(
  scheduleId: string,
  userId: string,
  paymentId: string,
  paidDate: string
): Promise<PaymentSchedule> {
  const result = await pool.query(
    `UPDATE payment_schedules
     SET status = 'paid',
         paid_date = $1,
         payment_id = $2,
         updated_at = NOW()
     WHERE id = $3 AND user_id = $4
     RETURNING *`,
    [paidDate, paymentId, scheduleId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Payment schedule not found');
  }

  return result.rows[0];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function generateContractNumber(userId: string): Promise<string> {
  const year = new Date().getFullYear();

  const result = await pool.query(
    `SELECT contract_number
     FROM customer_contracts
     WHERE user_id = $1 AND contract_number LIKE $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, `C${year}-%`]
  );

  if (result.rows.length === 0) {
    return `C${year}-001`;
  }

  const lastNumber = result.rows[0].contract_number;
  const match = lastNumber.match(/C\d{4}-(\d{3})/);

  if (!match) {
    return `C${year}-001`;
  }

  const nextNumber = parseInt(match[1]) + 1;
  return `C${year}-${nextNumber.toString().padStart(3, '0')}`;
}

export async function updateCustomerNextPayment(customerId: string, userId: string): Promise<void> {
  // Get next pending payment schedule for this customer
  const result = await pool.query(
    `SELECT * FROM payment_schedules
     WHERE customer_id = $1 AND user_id = $2 AND status = 'pending'
     ORDER BY due_date ASC
     LIMIT 1`,
    [customerId, userId]
  );

  if (result.rows.length > 0) {
    const nextSchedule = result.rows[0];
    await pool.query(
      `UPDATE customers
       SET next_payment_due_date = $1,
           next_payment_amount = $2,
           payment_currency = $3
       WHERE id = $4`,
      [nextSchedule.due_date, nextSchedule.amount, nextSchedule.currency, customerId]
    );
  } else {
    // No pending payments, clear next payment info
    await pool.query(
      `UPDATE customers
       SET next_payment_due_date = NULL,
           next_payment_amount = NULL,
           payment_currency = NULL
       WHERE id = $1`,
      [customerId]
    );
  }
}
