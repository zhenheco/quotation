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

export type PaymentFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
export type PaymentTerms = PaymentFrequency; // Alias for backward compatibility

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
  payment_terms: PaymentFrequency | null;

  // Next collection info (新增)
  next_collection_date: string | null;
  next_collection_amount: number | null;

  // Quotation reference (新增)
  quotation_id: string | null;

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
export type PaymentType = 'deposit' | 'installment' | 'final' | 'full' | 'recurring';
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

  // Payment frequency for recurring payments (新增)
  payment_frequency: PaymentFrequency | null;

  // Overdue tracking (新增)
  is_overdue: boolean;
  days_overdue: number;

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

  // Overdue tracking (新增)
  days_overdue: number;
  last_reminder_sent_at: string | null;
  reminder_count: number;

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

  // Contract fields (新增 - 當報價單轉為合約時)
  contract_signed_date: string | null;
  contract_expiry_date: string | null;
  payment_frequency: PaymentFrequency | null;
  next_collection_date: string | null;
  next_collection_amount: number | null;

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

// ============================================================================
// COLLECTION MANAGEMENT (新增)
// ============================================================================

/**
 * 收款狀態分類
 */
export type CollectionStatus = 'collected' | 'pending' | 'overdue';

/**
 * 已收款記錄 - 用於顯示在「已收款區域」
 */
export interface CollectedPaymentRecord {
  id: string;
  customer_id: string;
  customer_name_zh: string;
  customer_name_en: string;
  payment_type: PaymentType;
  payment_type_display: string; // 頭款/期款/尾款等中文顯示
  payment_frequency: PaymentFrequency | null; // 季繳/半年繳/年繳
  payment_date: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod | null;
  reference_number: string | null;
  receipt_url: string | null;
  related_number: string | null; // 關聯的報價單或合約編號
  notes: string | null;
}

/**
 * 未收款記錄 - 用於顯示在「未收款區域」(>30天)
 */
export interface UnpaidPaymentRecord {
  id: string;
  schedule_number: number;
  contract_id: string;
  contract_number: string;
  contract_title: string;
  customer_id: string;
  customer_name_zh: string;
  customer_name_en: string;
  customer_email: string | null;
  customer_phone: string | null;
  due_date: string;
  amount: number;
  currency: string;
  status: ScheduleStatus;
  days_overdue: number;
  payment_terms: PaymentFrequency | null;
  reminder_count: number;
  last_reminder_sent_at: string | null;
}

/**
 * 下次收款提醒
 */
export interface NextCollectionReminder {
  contract_id: string;
  contract_number: string;
  contract_title: string;
  customer_id: string;
  customer_name_zh: string;
  customer_name_en: string;
  customer_email: string | null;
  customer_phone: string | null;
  payment_terms: PaymentFrequency | null;
  next_collection_date: string;
  next_collection_amount: number;
  currency: string;
  days_until_collection: number; // 負數表示已逾期
  collection_status: 'overdue' | 'due_today' | 'due_soon' | 'upcoming';
}

/**
 * 收款統計摘要
 */
export interface CollectionStatistics {
  // 本月統計
  current_month: {
    total_collected: number;
    total_pending: number;
    total_overdue: number;
    currency: string;
  };
  // 本年統計
  current_year: {
    total_collected: number;
    total_pending: number;
    total_overdue: number;
    currency: string;
  };
  // 逾期統計
  overdue: {
    count: number;
    total_amount: number;
    average_days: number;
  };
}

/**
 * 合約收款進度
 */
export interface ContractPaymentProgress {
  contract_id: string;
  contract_number: string;
  customer_name_zh: string;
  customer_name_en: string;
  total_amount: number;
  total_paid: number;
  total_pending: number;
  total_overdue: number;
  currency: string;
  payment_completion_rate: number; // 0-100
  next_payment_due: string | null;
  status: ContractStatus;
}

// ============================================================================
// HELPER FUNCTIONS TYPES (新增)
// ============================================================================

/**
 * 產生付款排程的參數
 */
export interface GeneratePaymentSchedulesParams {
  contract_id: string;
  start_date?: string;
  payment_day?: number; // 1-31, default 5
}

/**
 * 產生付款排程的結果
 */
export interface GeneratePaymentSchedulesResult {
  schedule_count: number;
  schedules: PaymentSchedule[];
}

/**
 * 標記逾期付款的結果
 */
export interface MarkOverduePaymentsResult {
  updated_count: number;
  schedule_ids: string[];
}
