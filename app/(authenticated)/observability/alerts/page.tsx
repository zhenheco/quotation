'use client';

import { useState, useEffect } from 'react';

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  cooldown_minutes: number;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
}

interface AlertEvent {
  id: string;
  rule_id: string;
  triggered_at: string;
  resolved_at?: string;
  value: number;
  message: string;
}

const SEVERITY_COLORS = {
  critical: 'text-red-600 bg-red-100',
  warning: 'text-yellow-600 bg-yellow-100',
  info: 'text-blue-600 bg-blue-100',
};

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'events'>('events');

  useEffect(() => {
    fetchAlerts();
  }, []);

  async function fetchAlerts() {
    setLoading(true);
    try {
      // TODO: 從 observability-api 取得告警資料
      // const [rulesRes, eventsRes] = await Promise.all([
      //   fetch('/api/observability/alerts/rules'),
      //   fetch('/api/observability/alerts/events?resolved=false'),
      // ]);
      // const rulesData = await rulesRes.json();
      // const eventsData = await eventsRes.json();
      // setRules(rulesData.rules);
      // setEvents(eventsData.events);

      // Mock data for now
      setRules([
        {
          id: 'rule_1',
          name: '高錯誤率',
          condition: 'error_rate_percent',
          threshold: 5,
          cooldown_minutes: 30,
          severity: 'critical',
          enabled: true,
        },
        {
          id: 'rule_2',
          name: '高延遲',
          condition: 'p95_latency_ms',
          threshold: 2000,
          cooldown_minutes: 15,
          severity: 'warning',
          enabled: true,
        },
      ]);

      setEvents([
        {
          id: 'event_1',
          rule_id: 'rule_1',
          triggered_at: new Date(Date.now() - 600000).toISOString(),
          value: 6.5,
          message: 'Alert triggered: 高錯誤率 - error_rate_percent = 6.50 exceeds threshold 5',
        },
        {
          id: 'event_2',
          rule_id: 'rule_2',
          triggered_at: new Date(Date.now() - 300000).toISOString(),
          resolved_at: new Date(Date.now() - 120000).toISOString(),
          value: 2150,
          message: 'Alert triggered: 高延遲 - p95_latency_ms = 2150.00 exceeds threshold 2000',
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function resolveAlert(eventId: string) {
    try {
      // TODO: 標記告警為已解決
      // await fetch(`/api/observability/alerts/events/${eventId}/resolve`, {
      //   method: 'POST',
      // });
      console.log('Resolving alert:', eventId);
      await fetchAlerts();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">告警管理</h1>
        <button
          onClick={() => fetchAlerts()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          重新整理
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('events')}
            className={`border-b-2 px-1 py-3 text-sm font-medium ${
              activeTab === 'events'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:border-gray-300'
            }`}
          >
            告警事件
            {events.filter((e) => !e.resolved_at).length > 0 && (
              <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                {events.filter((e) => !e.resolved_at).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`border-b-2 px-1 py-3 text-sm font-medium ${
              activeTab === 'rules'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:border-gray-300'
            }`}
          >
            告警規則
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-gray-500">
          載入中...
        </div>
      ) : activeTab === 'events' ? (
        /* Alert Events */
        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
              沒有告警事件
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className={`rounded-lg border bg-white p-6 ${
                  event.resolved_at ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">
                        {event.resolved_at ? '✅' : '🚨'}
                      </span>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {event.message}
                        </h3>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                          <span>
                            觸發時間:{' '}
                            {new Date(event.triggered_at).toLocaleString('zh-TW')}
                          </span>
                          {event.resolved_at && (
                            <span className="text-green-600">
                              已於 {new Date(event.resolved_at).toLocaleString('zh-TW')} 解決
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {!event.resolved_at && (
                    <button
                      onClick={() => resolveAlert(event.id)}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
                    >
                      標記為已解決
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Alert Rules */
        <div className="rounded-lg border bg-white">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">
                  規則名稱
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">
                  條件
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">
                  閾值
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">
                  嚴重性
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">
                  冷卻時間
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">
                  狀態
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    沒有告警規則
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {rule.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <code className="rounded bg-gray-100 px-2 py-1">
                        {rule.condition}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {rule.threshold}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${SEVERITY_COLORS[rule.severity]}`}
                      >
                        {rule.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {rule.cooldown_minutes} 分鐘
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-sm font-medium ${
                          rule.enabled ? 'text-green-600' : 'text-gray-400'
                        }`}
                      >
                        {rule.enabled ? '啟用' : '停用'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
