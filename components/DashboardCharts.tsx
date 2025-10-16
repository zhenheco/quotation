'use client'

import { useState } from 'react'
import RevenueChart from '@/components/charts/RevenueChart'
import CurrencyChart from '@/components/charts/CurrencyChart'
import StatusChart from '@/components/charts/StatusChart'
import { useTranslations } from 'next-intl'

interface DashboardChartsProps {
  revenueData: Array<{
    month: string
    revenue: number
    count: number
  }>
  currencyData: Array<{
    currency: string
    value: number
    count: number
  }>
  statusData: Array<{
    status: string
    count: number
    value: number
  }>
  summary: {
    currentMonthRevenue: number
    revenueGrowth: number
    currentMonthCount: number
    countGrowth: number
    conversionRate: number
    acceptedCount: number
    pendingCount: number
    draftCount: number
  } | null
  defaultCurrency: string
}

export default function DashboardCharts({
  revenueData,
  currencyData,
  statusData,
  summary,
  defaultCurrency = 'TWD'
}: DashboardChartsProps) {
  const t = useTranslations()
  const [selectedPeriod, setSelectedPeriod] = useState('6months')

  // 格式化貨幣
  const formatCurrency = (amount: number) => {
    return `${defaultCurrency} ${amount.toLocaleString()}`
  }

  return (
    <div className="space-y-6">
      {/* 統計摘要卡片 */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 本月營收 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t('dashboard.monthlyRevenue')}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(summary.currentMonthRevenue)}
                </p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className={`text-sm font-medium ${summary.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(summary.revenueGrowth)}%
              </span>
              <span className="text-sm text-gray-500 ml-2">
                {t('dashboard.vsLastMonth')}
              </span>
            </div>
          </div>

          {/* 本月報價單 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t('dashboard.monthlyQuotations')}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {summary.currentMonthCount}
                </p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className={`text-sm font-medium ${summary.countGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.countGrowth >= 0 ? '↑' : '↓'} {Math.abs(summary.countGrowth)}%
              </span>
              <span className="text-sm text-gray-500 ml-2">
                {t('dashboard.vsLastMonth')}
              </span>
            </div>
          </div>

          {/* 轉換率 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t('dashboard.conversionRate')}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {summary.conversionRate}%
                </p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              {summary.acceptedCount} {t('dashboard.accepted')} / {summary.acceptedCount + summary.pendingCount} {t('dashboard.sent')}
            </div>
          </div>

          {/* 待處理 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {t('dashboard.pending')}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {summary.pendingCount}
                </p>
              </div>
              <div className="bg-yellow-100 rounded-full p-3">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              {summary.draftCount} {t('dashboard.drafts')}
            </div>
          </div>
        </div>
      )}

      {/* 圖表區域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 營收趨勢圖 */}
        <div className="lg:col-span-2">
          <RevenueChart
            data={revenueData}
            currency={defaultCurrency}
          />
        </div>

        {/* 幣別分布圖 */}
        <CurrencyChart
          data={currencyData}
        />

        {/* 狀態統計圖 */}
        <StatusChart
          data={statusData}
          currency={defaultCurrency}
        />
      </div>
    </div>
  )
}