'use client';

import { useState, useEffect } from 'react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
  requestId?: string;
  traceId?: string;
  userId?: string;
  path?: string;
  method?: string;
}

const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'critical'] as const;

const LEVEL_COLORS = {
  debug: 'text-gray-600 bg-gray-100',
  info: 'text-blue-600 bg-blue-100',
  warn: 'text-yellow-600 bg-yellow-100',
  error: 'text-red-600 bg-red-100',
  critical: 'text-purple-600 bg-purple-100',
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    level: '' as string,
    search: '',
    startTime: '',
    endTime: '',
  });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  async function fetchLogs() {
    setLoading(true);
    try {
      // TODO: 從 observability-api 取得日誌
      // const params = new URLSearchParams();
      // if (filters.level) params.set('level', filters.level);
      // if (filters.search) params.set('search', filters.search);
      // const response = await fetch(`/api/observability/logs?${params}`);
      // const data = await response.json();
      // setLogs(data.logs);

      // Mock data for now
      setLogs([
        {
          id: '1',
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'User logged in successfully',
          requestId: 'req_123',
          userId: 'user_456',
          path: '/api/auth/login',
          method: 'POST',
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 60000).toISOString(),
          level: 'error',
          message: 'Database connection timeout',
          requestId: 'req_124',
          path: '/api/quotations',
          method: 'GET',
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 120000).toISOString(),
          level: 'warn',
          message: 'Slow query detected: 2500ms',
          requestId: 'req_125',
          path: '/api/analytics',
          method: 'GET',
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">日誌檢視器</h1>
        <button
          onClick={() => fetchLogs()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          重新整理
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg border bg-white p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium">日誌等級</label>
            <select
              value={filters.level}
              onChange={(e) => setFilters({ ...filters, level: e.target.value })}
              className="w-full rounded border p-2"
            >
              <option value="">全部等級</option>
              {LOG_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="mb-1 block text-sm font-medium">搜尋</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="搜尋日誌訊息、Request ID、Trace ID..."
              className="w-full rounded border p-2"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-lg border bg-white">
        {loading ? (
          <div className="p-8 text-center text-gray-500">載入中...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">沒有找到日誌</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">時間</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">等級</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">訊息</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Request</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">路徑</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(log.timestamp).toLocaleString('zh-TW', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${LEVEL_COLORS[log.level]}`}
                      >
                        {log.level.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{log.message}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {log.requestId && (
                        <code className="rounded bg-gray-100 px-1">{log.requestId}</code>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {log.method && <span className="font-medium">{log.method}</span>}{' '}
                      <code className="text-xs">{log.path}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
