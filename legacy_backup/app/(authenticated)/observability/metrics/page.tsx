'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface MetricsData {
  timeseries: Array<{
    time_bucket: string;
    request_count: number;
    avg_response_time_ms: number;
    error_count: number;
  }>;
  errorRate: {
    error_count: number;
    client_error_count: number;
    success_count: number;
    total_requests: number;
    error_rate: number;
    success_rate: number;
  };
  topSlow: Array<{
    endpoint: string;
    avg_response_time_ms: number;
    p95_response_time_ms: number;
    request_count: number;
  }>;
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24');

  useEffect(() => {
    fetchMetrics();
  }, [timeRange]);

  async function fetchMetrics() {
    setLoading(true);
    try {
      // TODO: 從 observability-api 取得指標
      // const response = await fetch(`/api/observability/metrics?hours=${timeRange}`);
      // const data = await response.json();
      // setMetrics(data);

      // Mock data for now
      const now = Date.now();
      const mockTimeseries = Array.from({ length: 24 }, (_, i) => ({
        time_bucket: new Date(now - (23 - i) * 3600000).toISOString(),
        request_count: Math.floor(Math.random() * 1000) + 500,
        avg_response_time_ms: Math.floor(Math.random() * 200) + 100,
        error_count: Math.floor(Math.random() * 10),
      }));

      setMetrics({
        timeseries: mockTimeseries,
        errorRate: {
          error_count: 45,
          client_error_count: 120,
          success_count: 8735,
          total_requests: 8900,
          error_rate: 0.51,
          success_rate: 98.14,
        },
        topSlow: [
          {
            endpoint: '/api/analytics/revenue',
            avg_response_time_ms: 1245,
            p95_response_time_ms: 2150,
            request_count: 150,
          },
          {
            endpoint: '/api/quotations/export',
            avg_response_time_ms: 980,
            p95_response_time_ms: 1850,
            request_count: 85,
          },
        ],
      });
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">載入中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">效能指標</h1>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="rounded border p-2"
          >
            <option value="1">過去 1 小時</option>
            <option value="6">過去 6 小時</option>
            <option value="24">過去 24 小時</option>
            <option value="168">過去 7 天</option>
          </select>
          <button
            onClick={() => fetchMetrics()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            重新整理
          </button>
        </div>
      </div>

      {/* Error Rate Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-600">成功率</div>
          <div className="mt-2 text-2xl font-bold text-green-600">
            {metrics?.errorRate.success_rate.toFixed(2)}%
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {metrics?.errorRate.success_count.toLocaleString()} / {metrics?.errorRate.total_requests.toLocaleString()} 請求
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-600">錯誤率 (5xx)</div>
          <div className="mt-2 text-2xl font-bold text-red-600">
            {metrics?.errorRate.error_rate.toFixed(2)}%
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {metrics?.errorRate.error_count.toLocaleString()} 個伺服器錯誤
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-600">客戶端錯誤 (4xx)</div>
          <div className="mt-2 text-2xl font-bold text-yellow-600">
            {((metrics?.errorRate.client_error_count || 0) / (metrics?.errorRate.total_requests || 1) * 100).toFixed(2)}%
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {metrics?.errorRate.client_error_count.toLocaleString()} 個客戶端錯誤
          </div>
        </div>
      </div>

      {/* Request Volume Chart */}
      <div className="mb-6 rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">請求量趨勢</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={metrics?.timeseries}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time_bucket"
              tickFormatter={(value) =>
                new Date(value).toLocaleTimeString('zh-TW', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              }
            />
            <YAxis />
            <Tooltip
              labelFormatter={(value) =>
                new Date(value as string).toLocaleString('zh-TW')
              }
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="request_count"
              name="請求數"
              stroke="#3b82f6"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="error_count"
              name="錯誤數"
              stroke="#ef4444"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Response Time Chart */}
      <div className="mb-6 rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">平均回應時間</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={metrics?.timeseries}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time_bucket"
              tickFormatter={(value) =>
                new Date(value).toLocaleTimeString('zh-TW', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              }
            />
            <YAxis label={{ value: 'ms', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              labelFormatter={(value) =>
                new Date(value as string).toLocaleString('zh-TW')
              }
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="avg_response_time_ms"
              name="平均回應時間 (ms)"
              stroke="#10b981"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Slow Endpoints */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">最慢端點</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={metrics?.topSlow} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" label={{ value: 'ms', position: 'insideRight' }} />
            <YAxis type="category" dataKey="endpoint" width={200} />
            <Tooltip />
            <Legend />
            <Bar dataKey="avg_response_time_ms" name="平均時間" fill="#3b82f6" />
            <Bar dataKey="p95_response_time_ms" name="P95 時間" fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
