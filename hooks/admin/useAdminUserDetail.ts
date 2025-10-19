/**
 * 管理員使用者詳情 Hook
 *
 * 用於獲取單一使用者的詳細資訊
 */

'use client';

import { useState, useEffect } from 'react';

export interface UserCompanyMembership {
  company_id: string;
  company_name: string;
  role_name: string;
  role_display_name: string;
  joined_at: string;
  is_active: boolean;
}

export interface AdminUserDetail {
  user_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  is_super_admin: boolean;
  roles: Array<{
    role_name: string;
    display_name: string;
  }>;
  companies: UserCompanyMembership[];
}

interface UseAdminUserDetailReturn {
  user: AdminUserDetail | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAdminUserDetail(userId: string | null): UseAdminUserDetailReturn {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/users/${userId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch user detail');
      }

      setUser(data.user);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Error fetching admin user detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [userId]);

  return {
    user,
    loading,
    error,
    refetch: fetchUser
  };
}
