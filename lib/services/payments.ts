/**
 * Payments Service
 * Handles payment tracking for quotations and contracts
 */

import { createClient } from '@/lib/supabase/server';
import type {
  Payment,
  PaymentFormData,
  PaymentWithRelations,
  PaymentSummary,
  PaymentSchedule,
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
  const canRead = await hasPermission(userId, 'payments', 'read');
  if (!canRead) {
    throw new Error('Insufficient permissions to view payments');
  }

  const supabase = await createClient();
  let query = supabase
    .from('payments')
    .select(`
      *,
      customers!inner(
        id,
        name
      ),
      quotations(
        id,
        quotation_number,
        total
      ),
      customer_contracts(
        id,
        contract_number,
        total_amount
      )
    `)
    .eq('user_id', userId);

  if (filters?.customer_id) {
    query = query.eq('customer_id', filters.customer_id);
  }

  if (filters?.quotation_id) {
    query = query.eq('quotation_id', filters.quotation_id);
  }

  if (filters?.contract_id) {
    query = query.eq('contract_id', filters.contract_id);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.payment_type) {
    query = query.eq('payment_type', filters.payment_type);
  }

  query = query.order('payment_date', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(row => {
    const customerName = row.customers.name || { zh: '', en: '' };
    return {
      ...row,
      customer: {
        id: row.customers.id,
        company_name_zh: typeof customerName === 'string' ? customerName : (customerName.zh || ''),
        company_name_en: typeof customerName === 'string' ? customerName : (customerName.en || ''),
      },
      quotation: row.quotations ? {
        id: row.quotations.id,
        quotation_number: row.quotations.quotation_number,
        total: row.quotations.total,
      } : undefined,
      contract: row.customer_contracts ? {
        id: row.customer_contracts.id,
        contract_number: row.customer_contracts.contract_number,
        total_amount: row.customer_contracts.total_amount,
      } : undefined,
    };
  }) as PaymentWithRelations[];
}

export async function getPaymentById(
  paymentId: string,
  userId: string
): Promise<PaymentWithRelations | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      customers!inner(
        id,
        name
      ),
      quotations(
        id,
        quotation_number,
        total
      ),
      customer_contracts(
        id,
        contract_number,
        total_amount
      )
    `)
    .eq('id', paymentId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  if (!data) return null;

  const customerName = data.customers.name || { zh: '', en: '' };

  return {
    ...data,
    customer: {
      id: data.customers.id,
      company_name_zh: typeof customerName === 'string' ? customerName : (customerName.zh || ''),
      company_name_en: typeof customerName === 'string' ? customerName : (customerName.en || ''),
    },
    quotation: data.quotations ? {
      id: data.quotations.id,
      quotation_number: data.quotations.quotation_number,
      total: data.quotations.total,
    } : undefined,
    contract: data.customer_contracts ? {
      id: data.customer_contracts.id,
      contract_number: data.customer_contracts.contract_number,
      total_amount: data.customer_contracts.total_amount,
    } : undefined,
  } as PaymentWithRelations;
}

export async function createPayment(
  userId: string,
  data: PaymentFormData
): Promise<Payment> {
  const canWrite = await hasPermission(userId, 'payments', 'write');
  if (!canWrite) {
    throw new Error('Insufficient permissions to create payment');
  }

  if (!data.quotation_id && !data.contract_id) {
    throw new Error('Either quotation_id or contract_id must be provided');
  }

  const supabase = await createClient();

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      user_id: userId,
      quotation_id: data.quotation_id || null,
      contract_id: data.contract_id || null,
      customer_id: data.customer_id,
      payment_type: data.payment_type,
      payment_date: data.payment_date,
      amount: data.amount,
      currency: data.currency,
      payment_method: data.payment_method || null,
      reference_number: data.reference_number || null,
      notes: data.notes || null,
      status: 'confirmed',
    })
    .select()
    .single();

  if (error) throw error;

  if (data.contract_id) {
    await matchPaymentToSchedule(payment.id, data.contract_id, data.payment_date, userId);
    await updateCustomerNextPayment(data.customer_id, userId);
  }

  return payment as Payment;
}

export async function updatePayment(
  paymentId: string,
  userId: string,
  data: Partial<PaymentFormData> & { status?: string }
): Promise<Payment> {
  const canWrite = await hasPermission(userId, 'payments', 'write');
  if (!canWrite) {
    throw new Error('Insufficient permissions to update payment');
  }

  if (Object.keys(data).length === 0) {
    throw new Error('No fields to update');
  }

  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from('payments')
    .update(data)
    .eq('id', paymentId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  if (!updated) throw new Error('Payment not found');

  return updated as Payment;
}

export async function deletePayment(
  paymentId: string,
  userId: string
): Promise<void> {
  const canDelete = await hasPermission(userId, 'payments', 'delete');
  if (!canDelete) {
    throw new Error('Insufficient permissions to delete payment');
  }

  const supabase = await createClient();

  const { data: deleted, error } = await supabase
    .from('payments')
    .delete()
    .eq('id', paymentId)
    .eq('user_id', userId)
    .select('customer_id')
    .single();

  if (error) throw error;
  if (!deleted) throw new Error('Payment not found');

  const customerId = deleted.customer_id;
  await updateCustomerNextPayment(customerId, userId);
}

export async function updatePaymentReceipt(
  paymentId: string,
  userId: string,
  receiptUrl: string
): Promise<Payment> {
  return await updatePayment(paymentId, userId, { receipt_url: receiptUrl } as Partial<PaymentFormData>);
}

// ============================================================================
// PAYMENT SUMMARY & ANALYTICS
// ============================================================================

export async function getPaymentSummary(
  userId: string,
  currency: string = 'TWD'
): Promise<PaymentSummary> {
  const supabase = await createClient();

  const { data: paidData, error: paidError } = await supabase
    .from('payments')
    .select('amount')
    .eq('user_id', userId)
    .eq('currency', currency)
    .eq('status', 'confirmed');

  if (paidError) throw paidError;

  const totalPaid = (paidData || []).reduce((sum, row) => sum + row.amount, 0);

  const { data: pendingData, error: pendingError } = await supabase
    .from('payment_schedules')
    .select('amount, paid_amount')
    .eq('user_id', userId)
    .eq('currency', currency)
    .eq('status', 'pending');

  if (pendingError) throw pendingError;

  const totalPending = (pendingData || []).reduce(
    (sum, row) => sum + (row.amount - (row.paid_amount || 0)),
    0
  );

  const { data: overdueData, error: overdueError } = await supabase
    .from('payment_schedules')
    .select('amount, paid_amount')
    .eq('user_id', userId)
    .eq('currency', currency)
    .eq('status', 'overdue');

  if (overdueError) throw overdueError;

  const totalOverdue = (overdueData || []).reduce(
    (sum, row) => sum + (row.amount - (row.paid_amount || 0)),
    0
  );

  return {
    total_paid: totalPaid,
    total_pending: totalPending,
    total_overdue: totalOverdue,
    currency,
  };
}

export async function getPaymentsByMonth(
  userId: string,
  year: number,
  currency: string = 'TWD'
): Promise<{ month: number; total: number }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_payments_by_month', {
    p_user_id: userId,
    p_year: year,
    p_currency: currency,
  });

  if (error) throw error;

  return (data || []).map((row: { month: number; total: number }) => ({
    month: row.month,
    total: parseFloat(row.total.toString()),
  }));
}

export async function getPaymentsByCustomer(
  userId: string,
  limit: number = 10
): Promise<{ customer_id: string; customer_name: string; total: number }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payments')
    .select(`
      customer_id,
      amount,
      customers!inner(
        id,
        name
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'confirmed')
    .order('amount', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const grouped = (data || []).reduce((acc: Record<string, { customer_name: string; total: number }>, row) => {
    const customerId = row.customer_id;
    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    const customerName = customer?.name || { zh: '', en: '' };
    if (!acc[customerId]) {
      acc[customerId] = {
        customer_name: typeof customerName === 'string' ? customerName : (customerName.zh || ''),
        total: 0,
      };
    }
    acc[customerId].total += row.amount;
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([customer_id, data]) => ({
      customer_id,
      customer_name: data.customer_name,
      total: data.total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
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
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payment_schedules')
    .select('*')
    .eq('contract_id', contractId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .limit(1);

  if (error) throw error;

  if (data && data.length > 0) {
    const schedule = data[0];
    await markScheduleAsPaid(schedule.id, userId, paymentId, paymentDate);
  }
}

export async function calculateOutstandingBalance(
  quotationId?: string,
  contractId?: string
): Promise<number> {
  const supabase = await createClient();

  if (quotationId) {
    const { data, error } = await supabase
      .from('quotations')
      .select('total, total_paid')
      .eq('id', quotationId)
      .single();

    if (error || !data) return 0;

    return data.total - (data.total_paid || 0);
  }

  if (contractId) {
    const { data: contract, error: contractError } = await supabase
      .from('customer_contracts')
      .select('total_amount')
      .eq('id', contractId)
      .single();

    if (contractError || !contract) return 0;

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('contract_id', contractId)
      .eq('status', 'confirmed');

    if (paymentsError) return 0;

    const totalPaid = (payments || []).reduce((sum, p) => sum + p.amount, 0);
    return contract.total_amount - totalPaid;
  }

  return 0;
}

// ============================================================================
// PAYMENT REMINDERS
// ============================================================================

export async function getCustomersNeedingPaymentReminder(
  userId: string,
  daysBeforeDue: number = 7
): Promise<unknown[]> {
  const supabase = await createClient();

  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + daysBeforeDue);

  const { data, error } = await supabase
    .from('payment_schedules')
    .select(`
      *,
      customers!inner(
        id,
        user_id,
        customer_number,
        name,
        contact_person,
        email,
        phone
      )
    `)
    .eq('customers.user_id', userId)
    .eq('status', 'pending')
    .gte('due_date', today.toISOString().split('T')[0])
    .lte('due_date', futureDate.toISOString().split('T')[0])
    .order('due_date', { ascending: true });

  if (error) throw error;

  return (data || []).map(row => {
    const dueDate = new Date(row.due_date);
    const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const customer = row.customers;
    const customerName = customer.name || { zh: '', en: '' };

    return {
      ...customer,
      company_name_zh: typeof customerName === 'string' ? customerName : (customerName.zh || ''),
      company_name_en: typeof customerName === 'string' ? customerName : (customerName.en || ''),
      due_date: row.due_date,
      amount: row.amount,
      currency: row.currency,
      days_until_due: daysUntilDue,
    };
  });
}

export async function checkOverduePayments(userId: string): Promise<void> {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const { error: scheduleError } = await supabase
    .from('payment_schedules')
    .update({ status: 'overdue' })
    .eq('user_id', userId)
    .eq('status', 'pending')
    .lt('due_date', today);

  if (scheduleError) throw scheduleError;

  const { error: quotationError } = await supabase
    .from('quotations')
    .update({ payment_status: 'overdue' })
    .eq('user_id', userId)
    .in('payment_status', ['unpaid', 'partial'])
    .lt('payment_due_date', today);

  if (quotationError) throw quotationError;
}

// ============================================================================
// NEW ENHANCED PAYMENT FUNCTIONS
// ============================================================================

export async function recordPayment(
  userId: string,
  data: PaymentFormData & {
    schedule_id?: string;
  }
): Promise<Payment> {
  const canWrite = await hasPermission(userId, 'payments', 'write');
  if (!canWrite) {
    throw new Error('Insufficient permissions to record payment');
  }

  if (!data.quotation_id && !data.contract_id) {
    throw new Error('Either quotation_id or contract_id must be provided');
  }

  const supabase = await createClient();

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      user_id: userId,
      quotation_id: data.quotation_id || null,
      contract_id: data.contract_id || null,
      customer_id: data.customer_id,
      payment_type: data.payment_type,
      payment_date: data.payment_date,
      amount: data.amount,
      currency: data.currency,
      payment_method: data.payment_method || null,
      reference_number: data.reference_number || null,
      notes: data.notes || null,
      status: 'confirmed',
    })
    .select()
    .single();

  if (paymentError) throw paymentError;

  if (data.schedule_id) {
    const { error: scheduleError } = await supabase
      .from('payment_schedules')
      .update({
        status: 'paid',
        paid_date: data.payment_date,
        payment_id: payment.id,
        paid_amount: data.amount,
      })
      .eq('id', data.schedule_id)
      .eq('user_id', userId);

    if (scheduleError) throw scheduleError;
  } else if (data.contract_id) {
    await matchPaymentToSchedule(payment.id, data.contract_id, data.payment_date, userId);
  }

  if (data.contract_id) {
    await updateCustomerNextPayment(data.customer_id, userId);
  }

  return payment as Payment;
}

export async function getCollectedPayments(
  userId: string,
  filters?: {
    customer_id?: string;
    start_date?: string;
    end_date?: string;
    payment_type?: string;
  }
): Promise<unknown[]> {
  const canRead = await hasPermission(userId, 'payments', 'read');
  if (!canRead) {
    throw new Error('Insufficient permissions to view payments');
  }

  const supabase = await createClient();

  let query = supabase
    .from('payments')
    .select(`
      *,
      customers!inner(
        id,
        name,
        user_id
      )
    `)
    .eq('customers.user_id', userId)
    .eq('status', 'confirmed');

  if (filters?.customer_id) {
    query = query.eq('customer_id', filters.customer_id);
  }

  if (filters?.start_date) {
    query = query.gte('payment_date', filters.start_date);
  }

  if (filters?.end_date) {
    query = query.lte('payment_date', filters.end_date);
  }

  if (filters?.payment_type) {
    query = query.eq('payment_type', filters.payment_type);
  }

  query = query.order('payment_date', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  return data || [];
}

export async function getUnpaidPayments(
  userId: string,
  filters?: {
    customer_id?: string;
    min_days_overdue?: number;
  }
): Promise<unknown[]> {
  const canRead = await hasPermission(userId, 'payments', 'read');
  if (!canRead) {
    throw new Error('Insufficient permissions to view unpaid payments');
  }

  const supabase = await createClient();
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  let query = supabase
    .from('payment_schedules')
    .select(`
      *,
      customers!inner(
        id,
        name
      ),
      customer_contracts!inner(
        id,
        contract_number,
        title,
        user_id
      )
    `)
    .eq('customer_contracts.user_id', userId)
    .eq('status', 'overdue')
    .lt('due_date', thirtyDaysAgo.toISOString().split('T')[0]);

  if (filters?.customer_id) {
    query = query.eq('customer_id', filters.customer_id);
  }

  query = query.order('due_date', { ascending: true });

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(row => {
    const dueDate = new Date(row.due_date);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    if (!filters?.min_days_overdue || daysOverdue >= filters.min_days_overdue) {
      const customer = row.customers;
      const customerName = customer?.name || { zh: '', en: '' };
      return {
        ...row,
        customers: {
          ...customer,
          company_name_zh: typeof customerName === 'string' ? customerName : (customerName.zh || ''),
          company_name_en: typeof customerName === 'string' ? customerName : (customerName.en || ''),
        },
        days_overdue: daysOverdue,
      };
    }
    return null;
  }).filter(Boolean);
}

export async function getNextCollectionReminders(
  userId: string,
  filters?: {
    days_ahead?: number;
    status?: 'overdue' | 'due_today' | 'due_soon' | 'upcoming';
  }
): Promise<unknown[]> {
  const canRead = await hasPermission(userId, 'payments', 'read');

  if (!canRead) {
    throw new Error('Insufficient permissions to view collection reminders');
  }

  const supabase = await createClient();
  const today = new Date();
  const daysAhead = filters?.days_ahead || 30;
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + daysAhead);

  const query = supabase
    .from('customer_contracts')
    .select(`
      id,
      contract_number,
      title,
      customer_id,
      next_collection_date,
      next_collection_amount,
      currency,
      customers!inner(
        id,
        name,
        contact_person
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .not('next_collection_date', 'is', null)
    .lte('next_collection_date', futureDate.toISOString().split('T')[0]);

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []).map(row => {
    const collectionDate = new Date(row.next_collection_date as string);
    const daysUntilCollection = Math.floor((collectionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let collectionStatus: 'overdue' | 'due_today' | 'due_soon' | 'upcoming';
    if (daysUntilCollection < 0) {
      collectionStatus = 'overdue';
    } else if (daysUntilCollection === 0) {
      collectionStatus = 'due_today';
    } else if (daysUntilCollection <= 7) {
      collectionStatus = 'due_soon';
    } else {
      collectionStatus = 'upcoming';
    }

    if (filters?.status && collectionStatus !== filters.status) {
      return null;
    }

    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    const customerName = customer?.name || { zh: '', en: '' };

    return {
      contract_id: row.id,
      contract_number: row.contract_number,
      contract_title: row.title,
      customer_id: row.customer_id,
      customer_name_zh: typeof customerName === 'string' ? customerName : (customerName.zh || ''),
      customer_name_en: typeof customerName === 'string' ? customerName : (customerName.en || ''),
      contact_person: customer?.contact_person || null,
      next_collection_date: row.next_collection_date,
      next_collection_amount: row.next_collection_amount,
      currency: row.currency,
      days_until_collection: daysUntilCollection,
      collection_status: collectionStatus,
    };
  }).filter(Boolean);
}

export async function markPaymentAsOverdue(
  userId: string,
  scheduleId: string
): Promise<PaymentSchedule> {
  const canWrite = await hasPermission(userId, 'payments', 'write');
  if (!canWrite) {
    throw new Error('Insufficient permissions to update payment schedule');
  }

  const supabase = await createClient();
  const today = new Date();

  const { data: schedule, error: fetchError } = await supabase
    .from('payment_schedules')
    .select('due_date')
    .eq('id', scheduleId)
    .eq('user_id', userId)
    .single();

  if (fetchError) throw fetchError;
  if (!schedule) throw new Error('Payment schedule not found');

  const dueDate = new Date(schedule.due_date);
  const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

  const { data: updated, error } = await supabase
    .from('payment_schedules')
    .update({
      status: 'overdue',
      days_overdue: daysOverdue,
    })
    .eq('id', scheduleId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .select()
    .single();

  if (error) throw error;
  if (!updated) throw new Error('Payment schedule not found or already processed');

  return updated as PaymentSchedule;
}

export async function batchMarkOverduePayments(userId: string): Promise<{
  updated_count: number;
  schedule_ids: string[];
}> {
  const canWrite = await hasPermission(userId, 'payments', 'write');
  if (!canWrite) {
    throw new Error('Insufficient permissions to batch update payments');
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('mark_overdue_payments', {
    p_user_id: userId,
  });

  if (error) throw error;

  if (!data || data.length === 0) {
    return { updated_count: 0, schedule_ids: [] };
  }

  return {
    updated_count: data[0]?.updated_count || 0,
    schedule_ids: data[0]?.schedule_ids || [],
  };
}

export async function recordPaymentReminder(
  userId: string,
  scheduleId: string
): Promise<PaymentSchedule> {
  const canWrite = await hasPermission(userId, 'payments', 'write');
  if (!canWrite) {
    throw new Error('Insufficient permissions to record reminder');
  }

  const supabase = await createClient();

  const { data: schedule, error: fetchError } = await supabase
    .from('payment_schedules')
    .select('reminder_count')
    .eq('id', scheduleId)
    .eq('user_id', userId)
    .single();

  if (fetchError) throw fetchError;
  if (!schedule) throw new Error('Payment schedule not found');

  const { data: updated, error } = await supabase
    .from('payment_schedules')
    .update({
      last_reminder_sent_at: new Date().toISOString(),
      reminder_count: (schedule.reminder_count || 0) + 1,
    })
    .eq('id', scheduleId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  if (!updated) throw new Error('Payment schedule not found');

  return updated as PaymentSchedule;
}
