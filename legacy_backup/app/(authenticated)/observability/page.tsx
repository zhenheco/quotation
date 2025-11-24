'use client';

import { useEffect, useState } from 'react';

interface DashboardStats {
  totalRequests: number;
  errorRate: number;
  avgResponseTime: number;
  activeAlerts: number;
}

export default function ObservabilityOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // TODO: 從 observability-api 取得統計資料
        // const response = await fetch('/api/observability/stats');
        // const data = await response.json();

        // Mock data for now
        setStats({
          totalRequests: 12453,
          errorRate: 0.42,
          avgResponseTime: 245,
          activeAlerts: 3,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">載入中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-2xl font-bold">觀測系統總覽</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="總請求數"
          value={stats?.totalRequests.toLocaleString() || '0'}
          subtitle="過去 24 小時"
          icon="📊"
          trend="+12.5%"
          trendUp
        />
        <StatsCard
          title="錯誤率"
          value={`${stats?.errorRate}%` || '0%'}
          subtitle="5xx 錯誤率"
          icon="⚠️"
          trend="-0.3%"
          trendUp={false}
        />
        <StatsCard
          title="平均回應時間"
          value={`${stats?.avgResponseTime}ms` || '0ms'}
          subtitle="P95 延遲"
          icon="⚡"
          trend="-15ms"
          trendUp={false}
        />
        <StatsCard
          title="活躍告警"
          value={stats?.activeAlerts.toString() || '0'}
          subtitle="需要處理"
          icon="🚨"
          trend={stats?.activeAlerts === 0 ? '全部正常' : '需要關注'}
          trendUp={false}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">最近錯誤</h2>
          <div className="text-sm text-gray-500">即將推出...</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">慢查詢端點</h2>
          <div className="text-sm text-gray-500">即將推出...</div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendUp,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  trend: string;
  trendUp: boolean;
}) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="text-3xl">{icon}</div>
        <div className={`text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          {trend}
        </div>
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-gray-600">{title}</div>
        <div className="text-xs text-gray-500">{subtitle}</div>
      </div>
    </div>
  );
}
