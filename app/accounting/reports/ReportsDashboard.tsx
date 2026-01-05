'use client'

import { useState, useMemo, lazy, Suspense } from 'react'
import { useTrialBalance, useIncomeStatement, useBalanceSheet } from '@/hooks/accounting'
import { useCompany } from '@/hooks/useCompany'
import { formatAmount } from '@/lib/utils/formatters'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// 動態載入 TaxReportDashboard 以減少初始 bundle
const TaxReportDashboard = lazy(() => import('./TaxReportDashboard'))
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

// 顏色設定
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

// 科目類別對照
const accountCategoryLabels: Record<string, string> = {
  ASSET: '資產',
  LIABILITY: '負債',
  EQUITY: '權益',
  REVENUE: '收入',
  EXPENSE: '費用',
  Other: '其他',
}

export default function ReportsDashboard() {
  const { company } = useCompany()

  // 日期範圍
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const [startDate, setStartDate] = useState(firstDayOfMonth.toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0])
  const [activeTab, setActiveTab] = useState<'trial' | 'income' | 'balance' | 'tax'>('trial')

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

  const isLoading = loadingTrial || loadingIncome || loadingBalance

  return (
    <div className="space-y-6">
      {/* 日期篩選器 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">報表期間</CardTitle>
          <CardDescription>請選擇報表日期範圍</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                開始日期
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="開始日期"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                結束日期
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-label="結束日期"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 報表標籤頁 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'trial' | 'income' | 'balance' | 'tax')}>
        <TabsList className="grid w-full grid-cols-4 lg:w-[520px]">
          <TabsTrigger value="trial">試算表</TabsTrigger>
          <TabsTrigger value="income">損益表</TabsTrigger>
          <TabsTrigger value="balance">資產負債表</TabsTrigger>
          <TabsTrigger value="tax">營業稅申報</TabsTrigger>
        </TabsList>

        {isLoading ? (
          <Card className="mt-4">
            <CardContent className="flex justify-center py-12">
              <LoadingSpinner />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 試算表 */}
            <TabsContent value="trial">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>試算表</CardTitle>
                    <CardDescription>
                      期間餘額：{startDate} 至 {endDate}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {trialBalance && Array.isArray(trialBalance) && (
                      <TrialBalanceTable data={trialBalance as TrialBalanceItem[]} />
                    )}
                  </CardContent>
                </Card>

                {/* 試算表分析 */}
                {trialBalance && Array.isArray(trialBalance) && (
                  <TrialBalanceAnalysis data={trialBalance as TrialBalanceItem[]} />
                )}
              </div>
            </TabsContent>

            {/* 損益表 */}
            <TabsContent value="income">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>損益表</CardTitle>
                    <CardDescription>
                      期間分析：{startDate} 至 {endDate}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {incomeStatement && (
                      <IncomeStatementTable data={incomeStatement} />
                    )}
                  </CardContent>
                </Card>

                {/* 損益表分析 */}
                {incomeStatement && (
                  <IncomeStatementAnalysis data={incomeStatement} />
                )}
              </div>
            </TabsContent>

            {/* 資產負債表 */}
            <TabsContent value="balance">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>資產負債表</CardTitle>
                    <CardDescription>
                      截至：{endDate}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {balanceSheet && (
                      <BalanceSheetTable data={balanceSheet} />
                    )}
                  </CardContent>
                </Card>

                {/* 資產負債表分析 */}
                {balanceSheet && incomeStatement && (
                  <BalanceSheetAnalysis
                    balanceSheet={balanceSheet}
                    incomeStatement={incomeStatement}
                  />
                )}
              </div>
            </TabsContent>
          </>
        )}

        {/* 營業稅申報 - 獨立於其他報表的載入狀態 */}
        <TabsContent value="tax">
          <Suspense fallback={
            <Card className="mt-4">
              <CardContent className="flex justify-center py-12">
                <LoadingSpinner />
              </CardContent>
            </Card>
          }>
            <TaxReportDashboard />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================
// 類型定義
// ============================================

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

interface IncomeStatementData {
  revenue: { items: Array<{ accountCode: string; accountName: string; amount: number }>; total: number }
  expenses: { items: Array<{ accountCode: string; accountName: string; amount: number }>; total: number }
  netIncome: number
}

interface BalanceSheetData {
  assets: { items: Array<{ accountCode: string; accountName: string; balance: number }>; total: number }
  liabilities: { items: Array<{ accountCode: string; accountName: string; balance: number }>; total: number }
  equity: { items: Array<{ accountCode: string; accountName: string; balance: number }>; total: number }
}

// ============================================
// 試算表
// ============================================

function TrialBalanceTable({ data }: { data: TrialBalanceItem[] }) {
  const totalDebit = data.reduce((sum, item) => sum + (item.closing_debit || 0), 0)
  const totalCredit = data.reduce((sum, item) => sum + (item.closing_credit || 0), 0)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[120px]">科目代碼</TableHead>
          <TableHead>科目名稱</TableHead>
          <TableHead className="text-right">借方餘額</TableHead>
          <TableHead className="text-right">貸方餘額</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item, index) => (
          <TableRow key={index}>
            <TableCell className="font-mono text-muted-foreground">
              {item.account_code}
            </TableCell>
            <TableCell className="font-medium">{item.account_name}</TableCell>
            <TableCell className="text-right">
              {item.closing_debit > 0 ? (
                <span className="text-blue-600">{formatAmount(item.closing_debit)}</span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              {item.closing_credit > 0 ? (
                <span className="text-blue-600">{formatAmount(item.closing_credit)}</span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2} className="font-semibold">合計</TableCell>
          <TableCell className="text-right font-semibold text-blue-700">
            {formatAmount(totalDebit)}
          </TableCell>
          <TableCell className="text-right font-semibold text-blue-700">
            {formatAmount(totalCredit)}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  )
}

// ============================================
// 試算表分析元件
// ============================================

function TrialBalanceAnalysis({ data }: { data: TrialBalanceItem[] }) {
  const totalDebit = data.reduce((sum, item) => sum + (item.closing_debit || 0), 0)
  const totalCredit = data.reduce((sum, item) => sum + (item.closing_credit || 0), 0)
  const difference = Math.abs(totalDebit - totalCredit)
  const isBalanced = difference < 0.01 // 容許 0.01 的誤差

  // 找出異常科目（餘額超過總額 30% 的科目）
  const totalBalance = totalDebit + totalCredit
  const anomalies = data.filter(item => {
    const balance = Math.max(item.closing_debit, item.closing_credit)
    return balance > totalBalance * 0.3 && balance > 10000
  })

  // 準備趨勢圖表資料（按科目類別彙總）
  const categoryData = useMemo(() => {
    const categories: Record<string, { debit: number; credit: number }> = {}
    data.forEach(item => {
      const category = item.account_category || 'Other'
      if (!categories[category]) {
        categories[category] = { debit: 0, credit: 0 }
      }
      categories[category].debit += item.closing_debit || 0
      categories[category].credit += item.closing_credit || 0
    })
    return Object.entries(categories).map(([category, values]) => ({
      name: accountCategoryLabels[category] || category,
      debit: values.debit,
      credit: values.credit,
    }))
  }, [data])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">分析</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 借貸平衡檢查 */}
        <div className="rounded-lg border p-4">
          <h4 className="font-medium mb-3">借貸平衡檢查</h4>
          <p className="text-sm text-muted-foreground mb-4">
            借方總額應等於貸方總額，這是複式簿記的基本原則
          </p>
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
              isBalanced
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {isBalanced ? '平衡' : '不平衡'}
            </div>
            {!isBalanced && (
              <div className="text-sm text-red-600">
                差額: {formatAmount(difference)}
              </div>
            )}
          </div>
        </div>

        {/* 異常警示 */}
        <div className="rounded-lg border p-4">
          <h4 className="font-medium mb-3">異常警示</h4>
          {anomalies.length === 0 ? (
            <p className="text-sm text-green-600">無異常科目</p>
          ) : (
            <ul className="space-y-2">
              {anomalies.map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-amber-600">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  {item.account_code} {item.account_name} 餘額較大，請注意
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 趨勢圖表 */}
        {categoryData.length > 0 && (
          <div className="rounded-lg border p-4">
            <h4 className="font-medium mb-4">趨勢圖表</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tickFormatter={(v) => formatAmount(v)} />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip
                  formatter={(value: number) => formatAmount(value)}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Legend />
                <Bar dataKey="debit" name="借方" fill="#3b82f6" />
                <Bar dataKey="credit" name="貸方" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 損益表
// ============================================

function IncomeStatementTable({ data }: { data: IncomeStatementData }) {
  return (
    <div className="space-y-8">
      {/* 三欄摘要 */}
      <div className="grid grid-cols-3 gap-6">
        <div className="rounded-lg border bg-green-50 p-4">
          <div className="text-sm font-semibold text-green-800 mb-2">收入</div>
          <div className="text-2xl font-bold text-green-700">
            {formatAmount(data.revenue.total)}
          </div>
        </div>
        <div className="rounded-lg border bg-red-50 p-4">
          <div className="text-sm font-semibold text-red-800 mb-2">費用</div>
          <div className="text-2xl font-bold text-red-700">
            {formatAmount(data.expenses.total)}
          </div>
        </div>
        <div className={`rounded-lg border p-4 ${data.netIncome >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
          <div className={`text-sm font-semibold mb-2 ${data.netIncome >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
            淨利
          </div>
          <div className={`text-2xl font-bold ${data.netIncome >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
            {formatAmount(data.netIncome)}
          </div>
        </div>
      </div>

      {/* 收入明細 */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-green-800">收入明細</h3>
        <Table>
          <TableBody>
            {data.revenue.items.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="font-mono text-muted-foreground w-32">{item.accountCode}</TableCell>
                <TableCell>{item.accountName}</TableCell>
                <TableCell className="text-right text-green-600 font-medium">{formatAmount(item.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-green-100">
              <TableCell colSpan={2} className="font-semibold text-green-800">收入總計</TableCell>
              <TableCell className="text-right font-bold text-green-700">{formatAmount(data.revenue.total)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* 費用明細 */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-red-800">費用明細</h3>
        <Table>
          <TableBody>
            {data.expenses.items.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="font-mono text-muted-foreground w-32">{item.accountCode}</TableCell>
                <TableCell>{item.accountName}</TableCell>
                <TableCell className="text-right text-red-600 font-medium">{formatAmount(item.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-red-100">
              <TableCell colSpan={2} className="font-semibold text-red-800">費用總計</TableCell>
              <TableCell className="text-right font-bold text-red-700">{formatAmount(data.expenses.total)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* 淨利區塊 */}
      <div className={`p-6 rounded-xl ${data.netIncome >= 0 ? 'bg-gradient-to-r from-green-100 to-blue-100' : 'bg-gradient-to-r from-orange-100 to-red-100'}`}>
        <div className="flex justify-between items-center">
          <span className="text-xl font-bold">淨利</span>
          <span className={`text-3xl font-bold ${data.netIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatAmount(data.netIncome)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// 損益表分析元件
// ============================================

function IncomeStatementAnalysis({ data }: { data: IncomeStatementData }) {
  // 計算財務比率
  const netMargin = data.revenue.total > 0 ? (data.netIncome / data.revenue.total) * 100 : 0

  // 費用結構圓餅圖資料
  const expenseChartData = data.expenses.items.map((item, index) => ({
    name: item.accountName,
    value: item.amount,
    fill: COLORS[index % COLORS.length],
  }))

  // 收入 vs 費用柱狀圖
  const comparisonData = [
    { name: '收入', value: data.revenue.total, fill: '#10b981' },
    { name: '費用', value: data.expenses.total, fill: '#ef4444' },
    { name: '淨利', value: data.netIncome, fill: data.netIncome >= 0 ? '#3b82f6' : '#f59e0b' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">分析</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 財務比率 */}
        <div className="rounded-lg border p-4">
          <h4 className="font-medium mb-4">財務比率</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RatioCard
              title="淨利率"
              value={netMargin}
              description="淨利佔收入的比例"
              thresholds={{ healthy: 10, warning: 5 }}
            />
          </div>
        </div>

        {/* 費用結構圓餅圖 */}
        {expenseChartData.length > 0 && (
          <div className="rounded-lg border p-4">
            <h4 className="font-medium mb-4">費用結構</h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  label={({ name, percent }: any) => `${String(name)}: ${((percent as number) * 100).toFixed(1)}%`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {expenseChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatAmount(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 收入 vs 費用趨勢圖 */}
        <div className="rounded-lg border p-4">
          <h4 className="font-medium mb-4">趨勢圖表</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(v) => formatAmount(v)} />
              <Tooltip formatter={(value: number) => formatAmount(value)} />
              <Bar dataKey="value" fill="#8884d8">
                {comparisonData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// 資產負債表
// ============================================

function BalanceSheetTable({ data }: { data: BalanceSheetData }) {
  const SectionTable = ({
    title,
    items,
    total,
    colorClass,
    bgClass
  }: {
    title: string
    items: Array<{ accountCode: string; accountName: string; balance: number }>
    total: number
    colorClass: string
    bgClass: string
  }) => (
    <div className="mb-6">
      <h3 className={`text-lg font-semibold mb-4 ${colorClass}`}>{title}</h3>
      <Table>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={index}>
              <TableCell className="font-mono text-muted-foreground w-32">{item.accountCode}</TableCell>
              <TableCell>{item.accountName}</TableCell>
              <TableCell className="text-right font-medium">{formatAmount(item.balance)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className={bgClass}>
            <TableCell colSpan={2} className={`font-semibold ${colorClass}`}>
              {title}總計
            </TableCell>
            <TableCell className={`text-right font-bold ${colorClass}`}>{formatAmount(total)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* 左側：資產 */}
      <div className="space-y-4">
        <SectionTable
          title="資產"
          items={data.assets.items}
          total={data.assets.total}
          colorClass="text-blue-800"
          bgClass="bg-blue-100"
        />

        {/* 資產總計 */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl text-white">
          <div className="flex justify-between items-center">
            <span className="font-bold">資產總計</span>
            <span className="text-2xl font-bold">{formatAmount(data.assets.total)}</span>
          </div>
        </div>
      </div>

      {/* 右側：負債 + 權益 */}
      <div className="space-y-4">
        <SectionTable
          title="負債"
          items={data.liabilities.items}
          total={data.liabilities.total}
          colorClass="text-orange-800"
          bgClass="bg-orange-100"
        />
        <SectionTable
          title="權益"
          items={data.equity.items}
          total={data.equity.total}
          colorClass="text-purple-800"
          bgClass="bg-purple-100"
        />

        {/* 負債及權益總計 */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-xl text-white">
          <div className="flex justify-between items-center">
            <span className="font-bold">負債及權益總計</span>
            <span className="text-2xl font-bold">{formatAmount(data.liabilities.total + data.equity.total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// 資產負債表分析元件
// ============================================

function BalanceSheetAnalysis({
  balanceSheet,
  incomeStatement,
}: {
  balanceSheet: BalanceSheetData
  incomeStatement: IncomeStatementData
}) {
  // 計算財務比率
  const totalAssets = balanceSheet.assets.total
  const totalLiabilities = balanceSheet.liabilities.total
  const totalEquity = balanceSheet.equity.total
  const netIncome = incomeStatement.netIncome

  // 流動比率（假設流動資產是資產的 70%，這裡可以根據實際資料調整）
  // 在實際實作中，需要區分流動資產和非流動資產
  const estimatedCurrentAssets = totalAssets * 0.7
  const estimatedCurrentLiabilities = totalLiabilities * 0.5
  const currentRatio = estimatedCurrentLiabilities > 0 ? estimatedCurrentAssets / estimatedCurrentLiabilities : 0

  // 負債比率
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0

  // ROA
  const roa = totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0

  // ROE
  const roe = totalEquity > 0 ? (netIncome / totalEquity) * 100 : 0

  // 資產結構圓餅圖
  const assetChartData = balanceSheet.assets.items.map((item, index) => ({
    name: item.accountName,
    value: item.balance,
    fill: COLORS[index % COLORS.length],
  }))

  // 負債及權益結構圓餅圖
  const liabilityEquityData = [
    ...balanceSheet.liabilities.items.map((item, index) => ({
      name: item.accountName,
      value: item.balance,
      fill: COLORS[index % COLORS.length],
      type: 'liability' as const,
    })),
    ...balanceSheet.equity.items.map((item, index) => ({
      name: item.accountName,
      value: item.balance,
      fill: COLORS[(balanceSheet.liabilities.items.length + index) % COLORS.length],
      type: 'equity' as const,
    })),
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">分析</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 財務比率 */}
        <div className="rounded-lg border p-4">
          <h4 className="font-medium mb-4">財務比率</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <RatioCard
              title="流動比率"
              value={currentRatio}
              format="ratio"
              description="衡量短期償債能力"
              thresholds={{ healthy: 2, warning: 1 }}
            />
            <RatioCard
              title="負債比率"
              value={debtRatio}
              description="負債佔總資產比例"
              thresholds={{ healthy: 40, warning: 60 }}
              invertColors={true}
            />
            <RatioCard
              title="資產報酬率 (ROA)"
              value={roa}
              description="每元資產產生的利潤"
              thresholds={{ healthy: 5, warning: 2 }}
            />
            <RatioCard
              title="股東權益報酬率 (ROE)"
              value={roe}
              description="每元股東權益產生的利潤"
              thresholds={{ healthy: 15, warning: 8 }}
            />
          </div>
        </div>

        {/* 資產結構圓餅圖 */}
        <div className="grid md:grid-cols-2 gap-6">
          {assetChartData.length > 0 && (
            <div className="rounded-lg border p-4">
              <h4 className="font-medium mb-4">資產結構</h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={assetChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label={({ percent }: any) => `${((percent as number) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {assetChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatAmount(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {liabilityEquityData.length > 0 && (
            <div className="rounded-lg border p-4">
              <h4 className="font-medium mb-4">負債及權益結構</h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={liabilityEquityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label={({ percent }: any) => `${((percent as number) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {liabilityEquityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatAmount(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// 輔助元件
// ============================================

interface RatioCardProps {
  title: string
  value: number
  description: string
  thresholds: { healthy: number; warning: number }
  invertColors?: boolean
  format?: 'percent' | 'ratio'
}

function RatioCard({ title, value, description, thresholds, invertColors = false, format = 'percent' }: RatioCardProps) {
  let status: 'healthy' | 'warning' | 'critical'

  if (invertColors) {
    // 對於負債比率等，值越低越好
    if (value <= thresholds.healthy) status = 'healthy'
    else if (value <= thresholds.warning) status = 'warning'
    else status = 'critical'
  } else {
    // 對於流動比率、ROA 等，值越高越好
    if (value >= thresholds.healthy) status = 'healthy'
    else if (value >= thresholds.warning) status = 'warning'
    else status = 'critical'
  }

  const statusColors = {
    healthy: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    critical: 'bg-red-100 text-red-800 border-red-200',
  }

  const statusLabels = {
    healthy: '健康',
    warning: '注意',
    critical: '警告',
  }

  const formattedValue = format === 'ratio' ? value.toFixed(2) : `${value.toFixed(1)}%`

  return (
    <div className={`p-4 rounded-lg border ${statusColors[status]}`}>
      <div className="flex justify-between items-start mb-2">
        <h5 className="font-medium text-sm">{title}</h5>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/50">
          {statusLabels[status]}
        </span>
      </div>
      <div className="text-2xl font-bold mb-1">{formattedValue}</div>
      <p className="text-xs opacity-75">{description}</p>
    </div>
  )
}
