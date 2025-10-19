/**
 * 管理員統計資料 Hook
 *
 * 用於獲取系統統計資訊
 */

'use client';

import { useState, useEffect } from 'react';

interface SystemStats {
  overview: {
    totalCompanies: number;
    totalUsers: number;
    activeCompanies: number;
    totalMembers: number;
  };
  recent: {
    newCompanies: number;
    newUsers: number;
  };
  roles: Array<{
    role_name: string;
    display_name: string;
    count: number;
  }>;
}

interface UseAdminStatsReturn {
  stats: SystemStats | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAdminStats(): UseAdminStatsReturn {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/stats');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch stats');
      }

      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
}
