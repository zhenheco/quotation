'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useTranslations } from 'next-intl'

interface StatusChartProps {
  data: Array<{
    status: string
    count: number
    value: number
  }>
  currency: string
}

export default function StatusChart({ data, currency }: StatusChartProps) {
  const t = useTranslations()

  // 格式化貨幣
  const formatCurrency = (value: number) => {
    return `${currency} ${value.toLocaleString()}`
  }

  // 翻譯狀態名稱
  const translateStatus = (status: string) => {
    return t(`status.${status}`)
  }

  // 準備圖表數據
  const chartData = data.map(item => ({
    ...item,
    displayStatus: translateStatus(item.status)
  }))

  // 自訂 Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-600">
            {t('charts.quotationCount')}: {payload[0].value}
          </p>
          <p className="text-sm text-gray-600">
            {t('charts.totalValue')}: {formatCurrency(payload[1].value)}
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
      case 'rejected':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {t('charts.statusTitle')}
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
            name={t('charts.quotationCount')}
            radius={[8, 8, 0, 0]}
          />
          <Bar
            yAxisId="right"
            dataKey="value"
            fill="#10b981"
            name={t('charts.totalValue')}
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