'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { safeToLocaleString } from '@/lib/utils/formatters'

interface StatusChartProps {
  data: Array<{
    status: string
    count: number
    value: number
  }>
  currency: string
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
  }>;
  label?: string;
}

// 狀態翻譯對照表
const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  sent: '已發送',
  accepted: '已接受',
  expired: '已過期',
  rejected: '已拒絕',
}

export default function StatusChart({ data, currency }: StatusChartProps) {
  // 格式化貨幣
  const formatCurrency = (value: number | undefined | null) => {
    return `${currency} ${safeToLocaleString(value)}`
  }

  // 翻譯狀態名稱
  const translateStatus = (status: string) => {
    return STATUS_LABELS[status] || status
  }

  // 準備圖表數據
  const chartData = data.map(item => ({
    ...item,
    displayStatus: translateStatus(item.status)
  }))

  // 自訂 Tooltip
  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-600">
            報價單數: {payload[0].value}
          </p>
          <p className="text-sm text-gray-600">
            總金額: {formatCurrency(payload[1].value)}
          </p>
        </div>
      )
    }
    return null
  }

  // 狀態顏色映射
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return '#9ca3af'
      case 'sent':
        return '#3b82f6'
      case 'accepted':
        return '#10b981'
      case 'expired':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        狀態統計
      </h3>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="displayStatus"
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis
            yAxisId="left"
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#6b7280"
            fontSize={12}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            verticalAlign="top"
            height={36}
          />
          <Bar
            yAxisId="left"
            dataKey="count"
            fill="#6366f1"
            name="報價單數"
            radius={[8, 8, 0, 0]}
          />
          <Bar
            yAxisId="right"
            dataKey="value"
            fill="#10b981"
            name="總金額"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* 狀態摘要卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        {chartData.map((item) => (
          <div
            key={item.status}
            className="p-3 rounded-lg border border-gray-200"
            style={{
              borderLeftColor: getStatusColor(item.status),
              borderLeftWidth: '3px'
            }}
          >
            <p className="text-xs font-medium text-gray-600 uppercase">
              {item.displayStatus}
            </p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {item.count}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(item.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}