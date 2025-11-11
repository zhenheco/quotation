/**
 * useCompanyMembers Hook
 *
 * 取得特定公司的成員列表
 * 包含新增、更新、移除成員的功能
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RoleName } from '@/types/extended.types';

export interface CompanyMember {
  user_id: string;
  full_name: string | null;
  display_name: string | null;
  email: string;
  role_name: RoleName;
  role_level: number;
  is_owner: boolean;
  joined_at: string;
  is_active: boolean;
}

export interface AddMemberData {
  user_id: string;
  role_name: RoleName;
  full_name?: string;
  display_name?: string;
  phone?: string;
}

interface UseCompanyMembersResult {
  members: CompanyMember[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  addMember: (data: AddMemberData) => Promise<void>;
  updateMemberRole: (userId: string, roleName: RoleName) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  getMember: (userId: string) => CompanyMember | undefined;
}

export function useCompanyMembers(companyId: string | null): UseCompanyMembersResult {
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!companyId) {
      setMembers([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/company/${companyId}/members`);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('未登入或 session 已過期');
        }
        if (response.status === 403) {
          throw new Error('無權限查看此公司成員');
        }
        throw new Error(`取得公司成員失敗：${response.statusText}`);
      }

      const data = await response.json();
      setMembers(data.members || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('未知錯誤');
      setError(error);
      console.error('Error fetching company members:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  /**
   * 新增公司成員
   */
  const addMember = async (data: AddMemberData): Promise<void> => {
    if (!companyId) {
      throw new Error('未指定公司 ID');
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/company/${companyId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '新增成員失敗');
      }

      // 重新載入成員列表
      await fetchMembers();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('未知錯誤');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 更新成員角色
   */
  const updateMemberRole = async (userId: string, roleName: RoleName): Promise<void> => {
    if (!companyId) {
      throw new Error('未指定公司 ID');
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/company/${companyId}/members/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role_name: roleName })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '更新成員角色失敗');
      }

      // 重新載入成員列表
      await fetchMembers();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('未知錯誤');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 移除成員（軟刪除）
   */
  const removeMember = async (userId: string): Promise<void> => {
    if (!companyId) {
      throw new Error('未指定公司 ID');
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/company/${companyId}/members/${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '移除成員失敗');
      }

      // 重新載入成員列表
      await fetchMembers();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('未知錯誤');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 根據使用者 ID 取得成員資訊
   */
  const getMember = (userId: string): CompanyMember | undefined => {
    return members.find(m => m.user_id === userId);
  };

  return {
    members,
    loading,
    error,
    refetch: fetchMembers,
    addMember,
    updateMemberRole,
    removeMember,
    getMember
  };
}
