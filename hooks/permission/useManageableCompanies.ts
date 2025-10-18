/**
 * useManageableCompanies Hook
 *
 * 取得使用者可以管理的公司列表
 * 超級管理員：所有公司
 * 一般使用者：所屬公司（且為 owner 才能管理成員）
 */

'use client';

import { useState, useEffect } from 'react';

export interface ManageableCompany {
  company_id: string;
  company_name: string;
  is_owner: boolean;
  can_manage_members: boolean;
  logo_url: string | null;
}

interface UseManageableCompaniesResult {
  companies: ManageableCompany[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  total: number;
  canManageCompany: (companyId: string) => boolean;
  canManageMembers: (companyId: string) => boolean;
}

export function useManageableCompanies(): UseManageableCompaniesResult {
  const [companies, setCompanies] = useState<ManageableCompany[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchManageableCompanies = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/company/manageable');

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('未登入或 session 已過期');
        }
        throw new Error(`取得可管理公司列表失敗：${response.statusText}`);
      }

      const data = await response.json();
      setCompanies(data.companies || []);
      setTotal(data.total || 0);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('未知錯誤');
      setError(error);
      console.error('Error fetching manageable companies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManageableCompanies();
  }, []);

  /**
   * 檢查使用者是否可以管理特定公司
   */
  const canManageCompany = (companyId: string): boolean => {
    return companies.some(c => c.company_id === companyId);
  };

  /**
   * 檢查使用者是否可以管理特定公司的成員
   */
  const canManageMembers = (companyId: string): boolean => {
    const company = companies.find(c => c.company_id === companyId);
    return company?.can_manage_members || false;
  };

  return {
    companies,
    loading,
    error,
    refetch: fetchManageableCompanies,
    total,
    canManageCompany,
    canManageMembers
  };
}
