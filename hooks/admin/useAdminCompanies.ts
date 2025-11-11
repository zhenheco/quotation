/**
 * 管理員公司列表 Hook
 *
 * 用於獲取系統中所有公司的列表
 */

'use client';

import { useState, useEffect } from 'react';

export interface AdminCompany {
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
  owner_name: string;
  member_count: number;
  is_active: boolean;
}

interface UseAdminCompaniesReturn {
  companies: AdminCompany[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAdminCompanies(): UseAdminCompaniesReturn {
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/companies');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch companies');
      }

      setCompanies(data.companies || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Error fetching admin companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  return {
    companies,
    loading,
    error,
    refetch: fetchCompanies
  };
}
