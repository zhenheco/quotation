'use client';

import { useState, useEffect } from 'react';

interface Trace {
  id: string;
  request_id: string;
  trace_id: string;
  start_time: string;
  end_time: string;
  duration_ms: number;
  steps?: Record<string, unknown>;
}

export default function TracesPage() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [filters, setFilters] = useState({
    minDuration: '',
    maxDuration: '',
  });

  useEffect(() => {
    fetchTraces();
  }, [filters]);

  async function fetchTraces() {
    setLoading(true);
    try {
      // TODO: 從 observability-api 取得追蹤資料
      // const params = new URLSearchParams();
      // if (filters.minDuration) params.set('minDuration', filters.minDuration);
      // const response = await fetch(`/api/observability/traces?${params}`);
      // const data = await response.json();
      // setTraces(data.traces);

      // Mock data for now
      const now = Date.now();
      setTraces([
        {
          id: 'trace_1',
          request_id: 'req_123',
          trace_id: 'tr_abc123',
          start_time: new Date(now - 5000).toISOString(),
          end_time: new Date(now - 2000).toISOString(),
          duration_ms: 3000,
          steps: {
            'db_query': { duration_ms: 1200, status: 'success' },
            'external_api': { duration_ms: 1500, status: 'success' },
          },
        },
        {
          id: 'trace_2',
          request_id: 'req_124',
          trace_id: 'tr_abc124',
          start_time: new Date(now - 10000).toISOString(),
          end_time: new Date(now - 8500).toISOString(),
          duration_ms: 1500,
          steps: {
            'auth': { duration_ms: 200, status: 'success' },
            'db_query': { duration_ms: 1100, status: 'success' },
          },
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch traces:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">分散式追蹤</h1>
        <button
          onClick={() => fetchTraces()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          重新整理
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg border bg-white p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">最小持續時間 (ms)</label>
            <input
              type="number"
              value={filters.minDuration}
              onChange={(e) => setFilters({ ...filters, minDuration: e.target.value })}
              placeholder="例如：2000"
              className="w-full rounded border p-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">最大持續時間 (ms)</label>
            <input
              type="number"
              value={filters.maxDuration}
              onChange={(e) => setFilters({ ...filters, maxDuration: e.target.value })}
              placeholder="例如：5000"
              className="w-full rounded border p-2"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Traces List */}
        <div className="rounded-lg border bg-white">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold">追蹤列表</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">載入中...</div>
          ) : traces.length === 0 ? (
            <div className="p-8 text-center text-gray-500">沒有找到追蹤</div>
          ) : (
            <div className="divide-y">
              {traces.map((trace) => (
                <button
                  key={trace.id}
                  onClick={() => setSelectedTrace(trace)}
                  className={`w-full p-4 text-left transition-colors hover:bg-gray-50 ${
                    selectedTrace?.id === trace.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {trace.request_id}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Trace: <code className="rounded bg-gray-100 px-1">{trace.trace_id}</code>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${
                        trace.duration_ms > 2000 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {trace.duration_ms}ms
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {new Date(trace.start_time).toLocaleTimeString('zh-TW')}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Trace Details */}
        <div className="rounded-lg border bg-white">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold">追蹤詳情</h2>
          </div>
          {selectedTrace ? (
            <div className="p-4">
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-600">Request ID</dt>
                  <dd className="mt-1">
                    <code className="rounded bg-gray-100 px-2 py-1 text-sm">
                      {selectedTrace.request_id}
                    </code>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">Trace ID</dt>
                  <dd className="mt-1">
                    <code className="rounded bg-gray-100 px-2 py-1 text-sm">
                      {selectedTrace.trace_id}
                    </code>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">持續時間</dt>
                  <dd className="mt-1 text-lg font-semibold">
                    {selectedTrace.duration_ms}ms
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">開始時間</dt>
                  <dd className="mt-1 text-sm">
                    {new Date(selectedTrace.start_time).toLocaleString('zh-TW')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">結束時間</dt>
                  <dd className="mt-1 text-sm">
                    {new Date(selectedTrace.end_time).toLocaleString('zh-TW')}
                  </dd>
                </div>
                {selectedTrace.steps && Object.keys(selectedTrace.steps).length > 0 && (
                  <div>
                    <dt className="mb-2 text-sm font-medium text-gray-600">執行步驟</dt>
                    <dd>
                      <div className="space-y-2">
                        {Object.entries(selectedTrace.steps).map(([key, value]) => (
                          <div
                            key={key}
                            className="rounded border bg-gray-50 p-3"
                          >
                            <div className="font-medium text-gray-900">{key}</div>
                            <pre className="mt-2 text-xs text-gray-600">
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              選擇一個追蹤以查看詳情
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
