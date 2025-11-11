/**
 * API 路由通用類型定義
 */

import type { RoleName } from '@/types/rbac.types';

// ============ Customers API ============
export interface CreateCustomerRequest {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  tax_id?: string | null;
  contact_person?: string | null;
  company_id?: string | null;
}

export interface UpdateCustomerRequest {
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  tax_id?: string | null;
  contact_person?: string | null;
  company_id?: string | null;
}

// ============ Products API ============
export interface CreateProductRequest {
  name: string;
  description?: string | null;
  unit_price: number;
  cost_price?: number | null;
  cost_currency?: string | null;
  profit_margin?: number | null;
  unit?: string | null;
  category?: string | null;
  supplier?: string | null;
  is_active?: boolean;
  company_id?: string | null;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string | null;
  unit_price?: number;
  cost_price?: number | null;
  cost_currency?: string | null;
  profit_margin?: number | null;
  unit?: string | null;
  category?: string | null;
  supplier?: string | null;
  is_active?: boolean;
  company_id?: string | null;
}

// ============ Admin API ============
export interface AssignRoleRequest {
  role_name: RoleName;
  company_id?: string | null;
}

export interface AddCompanyMemberRequest {
  user_id: string;
  role_name: RoleName;
  full_name?: string | null;
  display_name?: string | null;
  phone?: string | null;
}

export interface UpdateMemberRoleRequest {
  role_id: string;
}

export interface CreateCompanyRequest {
  name: string;
  tax_id?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

export interface UpdateCompanyRequest {
  name?: string;
  tax_id?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

// ============ Payments API ============
export interface CreatePaymentRequest {
  contract_id: string;
  amount: number;
  due_date: string;
  payment_method?: string | null;
  notes?: string | null;
}

export interface UpdatePaymentRequest {
  amount?: number;
  due_date?: string;
  payment_method?: string | null;
  status?: string;
  notes?: string | null;
}

export interface SendPaymentReminderRequest {
  payment_id: string;
  recipient_email?: string;
  custom_message?: string;
}

// ============ Contracts API ============
export interface CreateContractRequest {
  quotation_id: string;
  contract_number?: string;
  start_date: string;
  end_date?: string | null;
  payment_terms?: string | null;
  notes?: string | null;
}

export interface UpdateContractRequest {
  contract_number?: string;
  start_date?: string;
  end_date?: string | null;
  payment_terms?: string | null;
  status?: string;
  notes?: string | null;
}

// ============ Quotations API ============
export interface CreateQuotationRequest {
  customer_id: string;
  title: string;
  valid_until: string;
  notes?: string | null;
  items: QuotationItemRequest[];
}

export interface QuotationItemRequest {
  product_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount?: number;
}

export interface UpdateQuotationRequest {
  customer_id?: string;
  title?: string;
  valid_until?: string;
  status?: string;
  notes?: string | null;
  items?: QuotationItemRequest[];
}

// ============ Company Settings API ============
export interface UpdateCompanySettingsRequest {
  name?: string;
  tax_id?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logo_url?: string | null;
}

// ============ RBAC API ============
export interface CheckPermissionRequest {
  permission: string;
  company_id?: string;
}

// ============ Generic Response Types ============
export interface SuccessResponse<T = unknown> {
  data: T;
  message?: string;
}

export interface ErrorResponse {
  error: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
