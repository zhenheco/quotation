/**
 * Extended type definitions for new features
 * - Company Settings
 * - Customer Contracts
 * - Payment Tracking
 * - Product Cost Management
 */

// ============================================================================
// COMPANY SETTINGS
// ============================================================================

export type PaymentTerms = 'quarterly' | 'semi_annual' | 'annual';

export interface CompanySettings {
  id: string;
  user_id: string;

  // Company information
  company_name_zh: string | null;
  company_name_en: string | null;
  tax_id: string | null;

  // Contact information
  address_zh: string | null;
  address_en: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;

  // File uploads
  logo_url: string | null;
  signature_url: string | null;
  passbook_image_url: string | null;

  // Bank information
  bank_name: string | null;
  bank_code: string | null;
  account_number: string | null;
  account_name: string | null;
  swift_code: string | null;

  // Default settings
  default_currency: string;
  default_tax_rate: number;

  // Payment terms
  default_payment_terms: PaymentTerms | null;
  default_payment_day: number;

  created_at: string;
  updated_at: string;
}

export interface CompanySettingsFormData {
  // Company information
  company_name_zh?: string;
  company_name_en?: string;
  tax_id?: string;

  // Contact information
  address_zh?: string;
  address_en?: string;
  phone?: string;
  email?: string;
  website?: string;

  // Bank information
  bank_name?: string;
  bank_code?: string;
  account_number?: string;
  account_name?: string;
  swift_code?: string;

  // Default settings
  default_currency?: string;
  default_tax_rate?: number;
  default_payment_terms?: PaymentTerms;
  default_payment_day?: number;
}

// ============================================================================
// CUSTOMER CONTRACTS
// ============================================================================

export type ContractStatus = 'draft' | 'active' | 'expired' | 'terminated';
export type CustomerContractStatus = 'prospect' | 'contracted' | 'expired' | 'terminated';

export interface CustomerContract {
  id: string;
  user_id: string;
  customer_id: string;

  // Contract details
  contract_number: string;
  title: string;

  // Dates
  start_date: string; // ISO date string
  end_date: string;
  signed_date: string | null;

  // Status
  status: ContractStatus;

  // Financial
  total_amount: number;
  currency: string;
  payment_terms: PaymentTerms | null;

  // File uploads
  contract_file_url: string | null;

  // Additional info
  notes: string | null;
  terms_and_conditions: string | null;

  created_at: string;
  updated_at: string;
}

export interface CustomerContractFormData {
  customer_id: string;
  title: string;
  start_date: string;
  end_date: string;
  signed_date?: string;
  total_amount: number;
  currency: string;
  payment_terms?: PaymentTerms;
  notes?: string;
  terms_and_conditions?: string;
}

export interface CustomerContractWithCustomer extends CustomerContract {
  customer: {
    id: string;
    company_name_zh: string;
    company_name_en: string;
    contact_person: string | null;
  };
}

// ============================================================================
// PAYMENTS
// ============================================================================

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';
export type PaymentType = 'deposit' | 'installment' | 'final' | 'full';
export type PaymentMethod = 'bank_transfer' | 'credit_card' | 'check' | 'cash' | 'other';
export type PaymentTransactionStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Payment {
  id: string;
  user_id: string;

  // Related records
  quotation_id: string | null;
  contract_id: string | null;
  customer_id: string;

  // Payment details
  payment_type: PaymentType;
  payment_date: string; // ISO date string
  amount: number;
  currency: string;

  // Payment method
  payment_method: PaymentMethod | null;
  reference_number: string | null;

  // File upload
  receipt_url: string | null;

  // Status
  status: PaymentTransactionStatus;

  // Notes
  notes: string | null;

  created_at: string;
  updated_at: string;
}

export interface PaymentFormData {
  quotation_id?: string;
  contract_id?: string;
  customer_id: string;
  payment_type: PaymentType;
  payment_date: string;
  amount: number;
  currency: string;
  payment_method?: PaymentMethod;
  reference_number?: string;
  notes?: string;
}

export interface PaymentWithRelations extends Payment {
  customer: {
    id: string;
    company_name_zh: string;
    company_name_en: string;
  };
  quotation?: {
    id: string;
    quotation_number: string;
    total: number;
  };
  contract?: {
    id: string;
    contract_number: string;
    total_amount: number;
  };
}

// ============================================================================
// PAYMENT SCHEDULES
// ============================================================================

export type ScheduleStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface PaymentSchedule {
  id: string;
  user_id: string;

  // Related records
  contract_id: string;
  customer_id: string;

  // Schedule details
  schedule_number: number;
  due_date: string; // ISO date string
  amount: number;
  currency: string;

  // Payment status
  status: ScheduleStatus;
  paid_amount: number;
  paid_date: string | null;

  // Link to payment
  payment_id: string | null;

  // Notes
  notes: string | null;

  created_at: string;
  updated_at: string;
}

export interface PaymentScheduleWithDetails extends PaymentSchedule {
  customer: {
    id: string;
    company_name_zh: string;
    company_name_en: string;
    contact_person: string | null;
  };
  contract: {
    id: string;
    contract_number: string;
    title: string;
  };
  days_overdue?: number;
  days_until_due?: number;
}

// ============================================================================
// EXTENDED PRODUCT TYPES (with cost)
// ============================================================================

export interface ProductWithCost {
  id: string;
  user_id: string;
  product_number: string;
  name_zh: string;
  name_en: string;
  description_zh: string | null;
  description_en: string | null;
  category: string | null;
  base_price: number;
  currency: string;

  // New cost fields
  cost_price: number | null;
  cost_currency: string | null;
  profit_margin: number | null;
  supplier: string | null;
  supplier_code: string | null;

  unit: string;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductProfitability {
  id: string;
  user_id: string;
  product_number: string;
  name_zh: string;
  name_en: string;
  base_price: number;
  currency: string;
  cost_price: number;
  cost_currency: string;
  profit_margin: number;
  profit_amount: number | null;
  category: string | null;
  is_active: boolean;
}

// ============================================================================
// EXTENDED CUSTOMER TYPES (with contract info)
// ============================================================================

export interface CustomerWithContract {
  id: string;
  user_id: string;
  customer_number: string;
  company_name_zh: string;
  company_name_en: string;
  tax_id: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address_zh: string | null;
  address_en: string | null;
  notes: string | null;

  // Contract fields
  contract_status: CustomerContractStatus;
  contract_expiry_date: string | null;
  payment_terms: PaymentTerms | null;
  next_payment_due_date: string | null;
  next_payment_amount: number | null;
  payment_currency: string | null;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// EXTENDED QUOTATION TYPES (with payment info)
// ============================================================================

export interface QuotationWithPayment {
  id: string;
  user_id: string;
  quotation_number: string;
  customer_id: string;
  issue_date: string;
  expiry_date: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  currency: string;
  notes: string | null;

  // Payment fields
  payment_status: PaymentStatus;
  payment_due_date: string | null;
  total_paid: number;
  deposit_amount: number | null;
  deposit_paid_date: string | null;
  final_payment_amount: number | null;
  final_payment_due_date: string | null;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export type AuditAction = 'create' | 'update' | 'delete';

export interface AuditLog {
  id: string;
  user_id: string;

  // What was changed
  table_name: string;
  record_id: string;
  action: AuditAction;

  // Changes
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;

  // Metadata
  ip_address: string | null;
  user_agent: string | null;

  created_at: string;
}

// ============================================================================
// DASHBOARD / ANALYTICS
// ============================================================================

export interface PaymentSummary {
  total_paid: number;
  total_pending: number;
  total_overdue: number;
  currency: string;
}

export interface UpcomingPayment {
  customer_id: string;
  customer_name_zh: string;
  customer_name_en: string;
  due_date: string;
  amount: number;
  currency: string;
  days_until_due: number;
  type: 'quotation' | 'contract';
}

export interface OverduePayment {
  customer_id: string;
  customer_name_zh: string;
  customer_name_en: string;
  due_date: string;
  amount: number;
  currency: string;
  days_overdue: number;
  type: 'quotation' | 'contract';
}
