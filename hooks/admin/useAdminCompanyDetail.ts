/**
 * 管理員公司詳情 Hook
 *
 * 用於獲取單一公司的詳細資訊
 */

'use client';

import { useState, useEffect } from 'react';

export interface CompanyMember {
  user_id: string;
  user_email: string;
  user_name: string | null;
  role_name: string;
  role_display_name: string;
  joined_at: string;
  is_active: boolean;
}

export interface AdminCompanyDetail {
  id: string;
  name: string;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
  owner_id: string;
  owner_email: string;
  owner_name: string | null;
  member_count: number;
  is_active: boolean;
  members: CompanyMember[];
}

interface UseAdminCompanyDetailReturn {
  company: AdminCompanyDetail | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAdminCompanyDetail(companyId: string | null): UseAdminCompanyDetailReturn {
  const [company, setCompany] = useState<AdminCompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCompany = async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/companies/${companyId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch company detail');
      }

      setCompany(data.company);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Error fetching admin company detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, [companyId]);

  return {
    company,
    loading,
    error,
    refetch: fetchCompany
  };
}
