/**
 * Customer Contracts Service
 * Handles customer contract management and payment schedules
 */

import { createClient } from '@/lib/supabase/server';
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
  const canRead = await hasPermission(userId, 'contracts', 'read');
  if (!canRead) {
    throw new Error('Insufficient permissions to view contracts');
  }

  const supabase = await createClient();
  let query = supabase
    .from('customer_contracts')
    .select(`
      *,
      customers!inner(
        id,
        name,
        contact_person
      )
    `)
    .eq('user_id', userId);

  if (filters?.customer_id) {
    query = query.eq('customer_id', filters.customer_id);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  query = query.order('created_at', { ascending: false });

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
        contact_person: row.customers.contact_person,
      },
    };
  }) as CustomerContractWithCustomer[];
}

export async function getContractById(
  contractId: string,
  userId: string
): Promise<CustomerContractWithCustomer | null> {
  const canRead = await hasPermission(userId, 'contracts', 'read');
  if (!canRead) {
    throw new Error('Insufficient permissions to view contract');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('customer_contracts')
    .select(`
      *,
      customers!inner(
        id,
        name,
        contact_person
      )
    `)
    .eq('id', contractId)
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
      contact_person: data.customers.contact_person,
    },
  } as CustomerContractWithCustomer;
}

export async function createContract(
  userId: string,
  data: CustomerContractFormData
): Promise<CustomerContract> {
  const canWrite = await hasPermission(userId, 'contracts', 'write');
  if (!canWrite) {
    throw new Error('Insufficient permissions to create contract');
  }

  const contractNumber = await generateContractNumber(userId);

  const supabase = await createClient();
  const { data: contract, error: contractError } = await supabase
    .from('customer_contracts')
    .insert({
      user_id: userId,
      customer_id: data.customer_id,
      contract_number: contractNumber,
      title: data.title,
      start_date: data.start_date,
      end_date: data.end_date,
      signed_date: data.signed_date || null,
      total_amount: data.total_amount,
      currency: data.currency,
      payment_terms: data.payment_terms || null,
      notes: data.notes || null,
      terms_and_conditions: data.terms_and_conditions || null,
      status: 'active',
    })
    .select()
    .single();

  if (contractError) throw contractError;

  const { error: customerError } = await supabase
    .from('customers')
    .update({
      contract_status: 'contracted',
      contract_expiry_date: data.end_date,
      payment_terms: data.payment_terms,
    })
    .eq('id', data.customer_id);

  if (customerError) throw customerError;

  if (data.payment_terms) {
    await generatePaymentSchedule(userId, contract.id, data.customer_id, {
      start_date: data.start_date,
      end_date: data.end_date,
      total_amount: data.total_amount,
      currency: data.currency,
      payment_terms: data.payment_terms,
    });
  }

  return contract as CustomerContract;
}

export async function updateContract(
  contractId: string,
  userId: string,
  data: Partial<CustomerContractFormData> & { status?: string }
): Promise<CustomerContract> {
  const canWrite = await hasPermission(userId, 'contracts', 'write');
  if (!canWrite) {
    throw new Error('Insufficient permissions to update contract');
  }

  if (Object.keys(data).length === 0) {
    throw new Error('No fields to update');
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from('customer_contracts')
    .update(data)
    .eq('id', contractId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  if (!updated) throw new Error('Contract not found');

  return updated as CustomerContract;
}

export async function deleteContract(
  contractId: string,
  userId: string
): Promise<void> {
  const canDelete = await hasPermission(userId, 'contracts', 'delete');
  if (!canDelete) {
    throw new Error('Insufficient permissions to delete contract');
  }

  const supabase = await createClient();
  const { data: deleted, error: deleteError } = await supabase
    .from('customer_contracts')
    .delete()
    .eq('id', contractId)
    .eq('user_id', userId)
    .select('customer_id')
    .single();

  if (deleteError) throw deleteError;
  if (!deleted) throw new Error('Contract not found');

  const { error: customerError } = await supabase
    .from('customers')
    .update({
      contract_status: 'prospect',
      contract_expiry_date: null,
      payment_terms: null,
    })
    .eq('id', deleted.customer_id);

  if (customerError) throw customerError;
}

export async function updateContractFile(
  contractId: string,
  userId: string,
  fileUrl: string
): Promise<CustomerContract> {
  return await updateContract(contractId, userId, { contract_file_url: fileUrl } as Partial<CustomerContractFormData>);
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

  const startDate = new Date(start_date);

  const supabase = await createClient();

  for (let i = 0; i < numberOfPayments; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i * intervalMonths);
    dueDate.setDate(5);

    const { data, error } = await supabase
      .from('payment_schedules')
      .insert({
        user_id: userId,
        contract_id: contractId,
        customer_id: customerId,
        schedule_number: i + 1,
        due_date: dueDate.toISOString().split('T')[0],
        amount: amountPerPayment,
        currency: currency,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    schedules.push(data as PaymentSchedule);
  }

  if (schedules.length > 0) {
    const { error } = await supabase
      .from('customers')
      .update({
        next_payment_due_date: schedules[0].due_date,
        next_payment_amount: schedules[0].amount,
        payment_currency: schedules[0].currency,
      })
      .eq('id', customerId);

    if (error) throw error;
  }

  return schedules;
}

export async function getPaymentSchedules(
  userId: string,
  contractId?: string
): Promise<PaymentScheduleWithDetails[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_payment_schedules_with_details', {
    p_user_id: userId,
    p_contract_id: contractId || null,
  });

  if (error) throw error;

  return (data || []) as PaymentScheduleWithDetails[];
}

export async function getOverduePayments(userId: string): Promise<PaymentScheduleWithDetails[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('overdue_payments')
    .select('*')
    .eq('user_id', userId)
    .order('days_overdue', { ascending: false });

  if (error) throw error;

  return (data || []) as PaymentScheduleWithDetails[];
}

export async function getUpcomingPayments(userId: string): Promise<PaymentScheduleWithDetails[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('upcoming_payments')
    .select('*')
    .eq('user_id', userId)
    .order('days_until_due', { ascending: true });

  if (error) throw error;

  return (data || []) as PaymentScheduleWithDetails[];
}

export async function markScheduleAsPaid(
  scheduleId: string,
  userId: string,
  paymentId: string,
  paidDate: string
): Promise<PaymentSchedule> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payment_schedules')
    .update({
      status: 'paid',
      paid_date: paidDate,
      payment_id: paymentId,
    })
    .eq('id', scheduleId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Payment schedule not found');

  return data as PaymentSchedule;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function generateContractNumber(userId: string): Promise<string> {
  const year = new Date().getFullYear();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('customer_contracts')
    .select('contract_number')
    .eq('user_id', userId)
    .like('contract_number', `C${year}-%`)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;

  if (!data || data.length === 0) {
    return `C${year}-001`;
  }

  const lastNumber = data[0].contract_number;
  const match = lastNumber?.match(/C\d{4}-(\d{3})/);

  if (!match) {
    return `C${year}-001`;
  }

  const nextNumber = parseInt(match[1]) + 1;
  return `C${year}-${nextNumber.toString().padStart(3, '0')}`;
}

export async function updateCustomerNextPayment(customerId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payment_schedules')
    .select('*')
    .eq('customer_id', customerId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .limit(1);

  if (error) throw error;

  if (data && data.length > 0) {
    const nextSchedule = data[0];
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        next_payment_due_date: nextSchedule.due_date,
        next_payment_amount: nextSchedule.amount,
        payment_currency: nextSchedule.currency,
      })
      .eq('id', customerId);

    if (updateError) throw updateError;
  } else {
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        next_payment_due_date: null,
        next_payment_amount: null,
        payment_currency: null,
      })
      .eq('id', customerId);

    if (updateError) throw updateError;
  }
}

// ============================================================================
// NEW ENHANCED CONTRACT FUNCTIONS
// ============================================================================

/**
 * Convert quotation to contract
 * 將報價單轉為合約，設定簽約日期、到期日、付款頻率和下次應收
 */
export async function convertQuotationToContract(
  userId: string,
  quotationId: string,
  contractData: {
    signed_date: string;
    expiry_date: string;
    payment_frequency: PaymentTerms;
    payment_day?: number;
  }
): Promise<{ contract: CustomerContract; quotation: unknown }> {
  const canWrite = await hasPermission(userId, 'contracts', 'write');
  if (!canWrite) {
    throw new Error('Insufficient permissions to create contract from quotation');
  }

  const supabase = await createClient();

  const { data: quotation, error: quotError } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', quotationId)
    .eq('user_id', userId)
    .single();

  if (quotError) throw quotError;
  if (!quotation) throw new Error('Quotation not found');

  const contractNumber = await generateContractNumber(userId);

  const { data: contract, error: contractError } = await supabase
    .from('customer_contracts')
    .insert({
      user_id: userId,
      customer_id: quotation.customer_id,
      quotation_id: quotationId,
      contract_number: contractNumber,
      title: `合約 - ${quotation.quotation_number}`,
      start_date: contractData.signed_date,
      end_date: contractData.expiry_date,
      signed_date: contractData.signed_date,
      total_amount: quotation.total,
      currency: quotation.currency,
      payment_terms: contractData.payment_frequency,
      notes: `由報價單 ${quotation.quotation_number} 轉換而成`,
      status: 'active',
    })
    .select()
    .single();

  if (contractError) throw contractError;

  const { error: quotUpdateError } = await supabase
    .from('quotations')
    .update({
      status: 'accepted',
      contract_signed_date: contractData.signed_date,
      contract_expiry_date: contractData.expiry_date,
      payment_frequency: contractData.payment_frequency,
    })
    .eq('id', quotationId);

  if (quotUpdateError) throw quotUpdateError;

  const paymentDay = contractData.payment_day || 5;
  const { error: rpcError } = await supabase.rpc('generate_payment_schedules_for_contract', {
    p_contract_id: contract.id,
    p_signed_date: contractData.signed_date,
    p_payment_day: paymentDay,
  });

  if (rpcError) throw rpcError;

  const { data: updatedContract, error: fetchError } = await supabase
    .from('customer_contracts')
    .select('*')
    .eq('id', contract.id)
    .single();

  if (fetchError) throw fetchError;

  const { data: nextCollection } = await supabase
    .from('customer_contracts')
    .select('next_collection_date, next_collection_amount')
    .eq('id', contract.id)
    .single();

  if (nextCollection) {
    const { error: quotUpdateError2 } = await supabase
      .from('quotations')
      .update({
        next_collection_date: nextCollection.next_collection_date,
        next_collection_amount: nextCollection.next_collection_amount,
      })
      .eq('id', quotationId);

    if (quotUpdateError2) throw quotUpdateError2;
  }

  const { error: customerError } = await supabase
    .from('customers')
    .update({
      contract_status: 'contracted',
      contract_expiry_date: contractData.expiry_date,
      payment_terms: contractData.payment_frequency,
    })
    .eq('id', quotation.customer_id);

  if (customerError) throw customerError;

  const { data: updatedQuotation } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', quotationId)
    .single();

  return {
    contract: updatedContract as CustomerContract,
    quotation: updatedQuotation,
  };
}

/**
 * Update next collection info for a contract
 * 更新合約的下次應收資訊
 */
export async function updateNextCollection(
  userId: string,
  contractId: string,
  data: {
    next_collection_date: string;
    next_collection_amount: number;
  }
): Promise<CustomerContract> {
  const canWrite = await hasPermission(userId, 'contracts', 'write');
  if (!canWrite) {
    throw new Error('Insufficient permissions to update contract');
  }

  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from('customer_contracts')
    .update({
      next_collection_date: data.next_collection_date,
      next_collection_amount: data.next_collection_amount,
    })
    .eq('id', contractId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  if (!updated) throw new Error('Contract not found');

  if (updated.quotation_id) {
    await supabase
      .from('quotations')
      .update({
        next_collection_date: data.next_collection_date,
        next_collection_amount: data.next_collection_amount,
      })
      .eq('id', updated.quotation_id);
  }

  return updated as CustomerContract;
}

/**
 * Get contract payment progress
 * 取得合約的收款進度
 */
export async function getContractPaymentProgress(
  userId: string,
  contractId: string
): Promise<unknown> {
  const canRead = await hasPermission(userId, 'contracts', 'read');
  if (!canRead) {
    throw new Error('Insufficient permissions to view contract progress');
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_contract_payment_progress', {
    p_user_id: userId,
    p_contract_id: contractId,
  });

  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Contract not found');

  return data[0];
}

/**
 * Get contracts with overdue payments
 * 取得有逾期款項的合約列表
 */
export async function getContractsWithOverduePayments(
  userId: string
): Promise<unknown[]> {
  const canRead = await hasPermission(userId, 'contracts', 'read');

  if (!canRead) {
    throw new Error('Insufficient permissions to view contracts');
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_contracts_with_overdue_payments', {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  return data || [];
}
