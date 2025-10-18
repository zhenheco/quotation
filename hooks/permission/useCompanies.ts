/**
 * useCompanies Hook
 *
 * 取得使用者所屬的公司列表
 */

'use client';

import { useState, useEffect } from 'react';
import type { RoleName } from '@/types/extended.types';

export interface UserCompany {
  company_id: string;
  company_name: string;
  role_name: RoleName;
  is_owner: boolean;
  logo_url: string | null;
}

interface UseCompaniesResult {
  companies: UserCompany[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  total: number;
  getCompany: (companyId: string) => UserCompany | undefined;
}

export function useCompanies(): UseCompaniesResult {
  const [companies, setCompanies] = useState<UserCompany[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/user/companies');

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('未登入或 session 已過期');
        }
        throw new Error(`取得公司列表失敗：${response.statusText}`);
      }

      const data = await response.json();
      setCompanies(data.companies || []);
      setTotal(data.total || 0);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('未知錯誤');
      setError(error);
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  /**
   * 根據公司 ID 取得公司資訊
   */
  const getCompany = (companyId: string): UserCompany | undefined => {
    return companies.find(c => c.company_id === companyId);
  };

  return {
    companies,
    loading,
    error,
    refetch: fetchCompanies,
    total,
    getCompany
  };
}
