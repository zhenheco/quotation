'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { safeToLocaleString } from '@/lib/utils/formatters'

interface RevenueChartProps {
  data: Array<{
    month: string
    revenue: number
    count: number
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

// 自訂 Tooltip
function RevenueChartTooltip({ active, payload, label, currency }: TooltipProps & { currency: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-600">
          營收: {currency} {safeToLocaleString(payload[0].value)}
        </p>
        <p className="text-sm text-gray-600">
          報價單數: {payload[1].value}
        </p>
      </div>
    )
  }
  return null
}

export default function RevenueChart({ data, currency }: RevenueChartProps) {

  // 格式化貨幣
  const formatCurrency = (value: number | undefined | null) => {
    return `${currency} ${safeToLocaleString(value)}`
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        營收趨勢
      </h3>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis
            yAxisId="left"
            stroke="#6b7280"
            fontSize={12}
            tickFormatter={formatCurrency}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#6b7280"
            fontSize={12}
          />
          <Tooltip content={<RevenueChartTooltip currency={currency} />} />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            verticalAlign="top"
            height={36}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="revenue"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ fill: '#2563eb', r: 4 }}
            activeDot={{ r: 6 }}
            name="營收"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="count"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
            name="報價單數"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}