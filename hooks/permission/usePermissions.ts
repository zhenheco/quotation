/**
 * usePermissions Hook
 *
 * 取得當前使用者的完整權限資訊
 * 包含：超管狀態、全域權限、角色資訊、公司權限
 */

'use client';

import { useState, useEffect } from 'react';
import type { RoleName } from '@/types/extended.types';

export interface CompanyPermission {
  company_id: string;
  company_name: string;
  role_name: RoleName;
  is_owner: boolean;
  logo_url: string | null;
  permissions: string[];
}

export interface UserPermissions {
  user_id: string;
  is_super_admin: boolean;
  global_permissions: string[];
  role_name: RoleName;
  role_level: number;
  companies: CompanyPermission[];
}

interface UsePermissionsResult {
  permissions: UserPermissions | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  hasPermission: (permission: string, companyId?: string) => boolean;
  isSuperAdmin: boolean;
  isCompanyOwner: (companyId: string) => boolean;
  getCompanyRole: (companyId: string) => RoleName | null;
}

export function usePermissions(): UsePermissionsResult {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/user/permissions');

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('未登入或 session 已過期');
        }
        throw new Error(`取得權限失敗：${response.statusText}`);
      }

      const data = await response.json();
      setPermissions(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('未知錯誤');
      setError(error);
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  /**
   * 檢查使用者是否擁有特定權限
   * @param permission 權限名稱（例如：'products.create'）
   * @param companyId 可選的公司 ID，若提供則檢查公司層級權限
   */
  const hasPermission = (permission: string, companyId?: string): boolean => {
    if (!permissions) return false;

    // 超級管理員擁有所有權限
    if (permissions.is_super_admin) return true;

    // 如果指定公司 ID，檢查公司層級權限
    if (companyId) {
      const company = permissions.companies.find(c => c.company_id === companyId);
      return company?.permissions.includes(permission) || false;
    }

    // 檢查全域權限
    return permissions.global_permissions.includes(permission);
  };

  /**
   * 檢查使用者是否為特定公司的 owner
   */
  const isCompanyOwner = (companyId: string): boolean => {
    if (!permissions) return false;
    if (permissions.is_super_admin) return true;

    const company = permissions.companies.find(c => c.company_id === companyId);
    return company?.is_owner || false;
  };

  /**
   * 取得使用者在特定公司的角色
   */
  const getCompanyRole = (companyId: string): RoleName | null => {
    if (!permissions) return null;

    const company = permissions.companies.find(c => c.company_id === companyId);
    return company?.role_name || null;
  };

  return {
    permissions,
    loading,
    error,
    refetch: fetchPermissions,
    hasPermission,
    isSuperAdmin: permissions?.is_super_admin || false,
    isCompanyOwner,
    getCompanyRole
  };
}
