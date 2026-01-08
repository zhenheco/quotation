'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { safeToLocaleString } from '@/lib/utils/formatters'

interface CurrencyChartProps {
  data: Array<{
    currency: string
    value: number
    count: number
  }>
}

interface PieLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      currency: string;
      value: number;
      percentage: string;
      count: number;
    };
  }>;
}

interface LegendProps {
  payload?: Array<{
    value: string;
    color: string;
  }>;
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function CurrencyChart({ data }: CurrencyChartProps) {

  // 計算百分比（防止除以零導致 NaN）
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const dataWithPercentage = data.map(item => ({
    ...item,
    percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0'
  }))

  // 自訂標籤
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: PieLabelProps) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    )
  }

  // 自訂 Tooltip
  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">
            {data.currency}
          </p>
          <p className="text-sm text-gray-600">
            金額: {data.currency} {safeToLocaleString(data.value)}
          </p>
          <p className="text-sm text-gray-600">
            佔比: {data.percentage}%
          </p>
          <p className="text-sm text-gray-600">
            報價單數: {data.count}
          </p>
        </div>
      )
    }
    return null
  }

  // 自訂圖例
  const renderLegend = (props: LegendProps) => {
    const { payload } = props

    return (
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
        {payload?.map((entry, index: number) => (
          <li key={`item-${index}`} className="flex items-center text-sm">
            <span
              className="inline-block w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-700">
              {entry.value}: {dataWithPercentage[index]?.percentage}%
            </span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        幣別分布
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={dataWithPercentage}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel as never}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            nameKey="currency"
          >
            {dataWithPercentage.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            content={renderLegend}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}