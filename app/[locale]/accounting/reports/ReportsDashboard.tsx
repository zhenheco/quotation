'use client'

import { useState } from 'react'
import { useTrialBalance, useIncomeStatement, useBalanceSheet } from '@/hooks/accounting'
import { useCompany } from '@/hooks/useCompany'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// 簡易金額格式化
function formatAmount(amount: number | null | undefined): string {
  return `NT$ ${(amount || 0).toLocaleString('zh-TW', { maximumFractionDigits: 0 })}`
}

export default function ReportsDashboard() {
  const { company } = useCompany()

  // 日期範圍
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const [startDate, setStartDate] = useState(firstDayOfMonth.toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0])
  const [activeTab, setActiveTab] = useState<'trial' | 'income' | 'balance'>('trial')

  const { data: trialBalance, isLoading: loadingTrial } = useTrialBalance(
    company?.id || '',
    startDate,
    endDate,
    activeTab === 'trial' && !!company?.id
  )

  const { data: incomeStatement, isLoading: loadingIncome } = useIncomeStatement(
    company?.id || '',
    startDate,
    endDate,
    activeTab === 'income' && !!company?.id
  )

  const { data: balanceSheet, isLoading: loadingBalance } = useBalanceSheet(
    company?.id || '',
    endDate,
    activeTab === 'balance' && !!company?.id
  )

  const tabs = [
    { id: 'trial', label: '試算表' },
    { id: 'income', label: '損益表' },
    { id: 'balance', label: '資產負債表' },
  ]

  const isLoading = loadingTrial || loadingIncome || loadingBalance

  return (
    <div className="space-y-6">
      {/* 日期篩選器 */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            開始日期
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            結束日期
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      {/* 標籤頁 */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'trial' | 'income' | 'balance')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {/* 試算表 */}
              {activeTab === 'trial' && trialBalance && Array.isArray(trialBalance) && (
                <TrialBalanceTable data={trialBalance as TrialBalanceItem[]} />
              )}

              {/* 損益表 */}
              {activeTab === 'income' && incomeStatement && (
                <IncomeStatementTable data={incomeStatement} />
              )}

              {/* 資產負債表 */}
              {activeTab === 'balance' && balanceSheet && (
                <BalanceSheetTable data={balanceSheet} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface TrialBalanceItem {
  account_id: string
  account_code: string
  account_name: string
  account_category: string
  opening_debit: number
  opening_credit: number
  period_debit: number
  period_credit: number
  closing_debit: number
  closing_credit: number
}

function TrialBalanceTable({ data }: { data: TrialBalanceItem[] }) {
  const totalDebit = data.reduce((sum, item) => sum + (item.closing_debit || 0), 0)
  const totalCredit = data.reduce((sum, item) => sum + (item.closing_credit || 0), 0)

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              科目代碼
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              科目名稱
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              借方餘額
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              貸方餘額
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                {item.account_code}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {item.account_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                {item.closing_debit > 0 ? formatAmount(item.closing_debit) : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                {item.closing_credit > 0 ? formatAmount(item.closing_credit) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-100 font-semibold">
          <tr>
            <td colSpan={2} className="px-6 py-4 text-sm">
              合計
            </td>
            <td className="px-6 py-4 text-sm text-right">
              {formatAmount(totalDebit)}
            </td>
            <td className="px-6 py-4 text-sm text-right">
              {formatAmount(totalCredit)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

interface IncomeStatementData {
  revenue: { items: Array<{ accountCode: string; accountName: string; amount: number }>; total: number }
  expenses: { items: Array<{ accountCode: string; accountName: string; amount: number }>; total: number }
  netIncome: number
}

function IncomeStatementTable({ data }: { data: IncomeStatementData }) {
  return (
    <div className="space-y-8">
      {/* 收入 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">營業收入</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="bg-white divide-y divide-gray-200">
            {data.revenue.items.map((item, index) => (
              <tr key={index}>
                <td className="px-6 py-3 text-sm font-mono w-32">{item.accountCode}</td>
                <td className="px-6 py-3 text-sm">{item.accountName}</td>
                <td className="px-6 py-3 text-sm text-right">{formatAmount(item.amount)}</td>
              </tr>
            ))}
            <tr className="bg-green-50 font-semibold">
              <td colSpan={2} className="px-6 py-3 text-sm">收入合計</td>
              <td className="px-6 py-3 text-sm text-right text-green-700">{formatAmount(data.revenue.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 費用 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">營業費用</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="bg-white divide-y divide-gray-200">
            {data.expenses.items.map((item, index) => (
              <tr key={index}>
                <td className="px-6 py-3 text-sm font-mono w-32">{item.accountCode}</td>
                <td className="px-6 py-3 text-sm">{item.accountName}</td>
                <td className="px-6 py-3 text-sm text-right">{formatAmount(item.amount)}</td>
              </tr>
            ))}
            <tr className="bg-red-50 font-semibold">
              <td colSpan={2} className="px-6 py-3 text-sm">費用合計</td>
              <td className="px-6 py-3 text-sm text-right text-red-700">{formatAmount(data.expenses.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 淨利 */}
      <div className={`p-6 rounded-lg ${data.netIncome >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
        <div className="flex justify-between items-center">
          <span className="text-xl font-bold">本期淨利</span>
          <span className={`text-2xl font-bold ${data.netIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatAmount(data.netIncome)}
          </span>
        </div>
      </div>
    </div>
  )
}

interface BalanceSheetData {
  assets: { items: Array<{ accountCode: string; accountName: string; balance: number }>; total: number }
  liabilities: { items: Array<{ accountCode: string; accountName: string; balance: number }>; total: number }
  equity: { items: Array<{ accountCode: string; accountName: string; balance: number }>; total: number }
}

function BalanceSheetTable({ data }: { data: BalanceSheetData }) {
  const SectionTable = ({ title, items, total, colorClass }: { title: string; items: Array<{ accountCode: string; accountName: string; balance: number }>; total: number; colorClass: string }) => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <table className="min-w-full divide-y divide-gray-200">
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item, index) => (
            <tr key={index}>
              <td className="px-6 py-3 text-sm font-mono w-32">{item.accountCode}</td>
              <td className="px-6 py-3 text-sm">{item.accountName}</td>
              <td className="px-6 py-3 text-sm text-right">{formatAmount(item.balance)}</td>
            </tr>
          ))}
          <tr className={`${colorClass} font-semibold`}>
            <td colSpan={2} className="px-6 py-3 text-sm">合計</td>
            <td className="px-6 py-3 text-sm text-right">{formatAmount(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* 左側：資產 */}
      <div>
        <SectionTable
          title="資產"
          items={data.assets.items}
          total={data.assets.total}
          colorClass="bg-blue-50"
        />
      </div>

      {/* 右側：負債 + 權益 */}
      <div>
        <SectionTable
          title="負債"
          items={data.liabilities.items}
          total={data.liabilities.total}
          colorClass="bg-orange-50"
        />
        <SectionTable
          title="權益"
          items={data.equity.items}
          total={data.equity.total}
          colorClass="bg-purple-50"
        />
        <div className="bg-gray-100 p-4 rounded-lg">
          <div className="flex justify-between items-center font-bold">
            <span>負債及權益合計</span>
            <span>{formatAmount(data.liabilities.total + data.equity.total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
