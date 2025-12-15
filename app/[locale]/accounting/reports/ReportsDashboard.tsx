'use client'

import { useState } from 'react'
import { useTrialBalance, useIncomeStatement, useBalanceSheet } from '@/hooks/accounting'
import { useCompany } from '@/hooks/useCompany'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

/**
 * 金額格式化
 */
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

  const isLoading = loadingTrial || loadingIncome || loadingBalance

  return (
    <div className="space-y-6">
      {/* 日期篩選器 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">報表期間</CardTitle>
          <CardDescription>選擇要查詢的日期範圍</CardDescription>
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
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <Button variant="outline" size="sm">
              匯出 Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 報表標籤頁 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'trial' | 'income' | 'balance')}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="trial">試算表</TabsTrigger>
          <TabsTrigger value="income">損益表</TabsTrigger>
          <TabsTrigger value="balance">資產負債表</TabsTrigger>
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
              <Card>
                <CardHeader>
                  <CardTitle>試算表</CardTitle>
                  <CardDescription>
                    {startDate} 至 {endDate} 期間各科目餘額
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {trialBalance && Array.isArray(trialBalance) && (
                    <TrialBalanceTable data={trialBalance as TrialBalanceItem[]} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 損益表 */}
            <TabsContent value="income">
              <Card>
                <CardHeader>
                  <CardTitle>損益表</CardTitle>
                  <CardDescription>
                    {startDate} 至 {endDate} 期間營收與費用分析
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {incomeStatement && (
                    <IncomeStatementTable data={incomeStatement} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 資產負債表 */}
            <TabsContent value="balance">
              <Card>
                <CardHeader>
                  <CardTitle>資產負債表</CardTitle>
                  <CardDescription>
                    截至 {endDate} 的財務狀況
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {balanceSheet && (
                    <BalanceSheetTable data={balanceSheet} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
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

interface IncomeStatementData {
  revenue: { items: Array<{ accountCode: string; accountName: string; amount: number }>; total: number }
  expenses: { items: Array<{ accountCode: string; accountName: string; amount: number }>; total: number }
  netIncome: number
}

function IncomeStatementTable({ data }: { data: IncomeStatementData }) {
  return (
    <div className="space-y-8">
      {/* 三欄摘要 */}
      <div className="grid grid-cols-3 gap-6">
        <div className="rounded-lg border bg-green-50 p-4">
          <div className="text-sm font-semibold text-green-800 mb-2">營業收入</div>
          <div className="text-2xl font-bold text-green-700">
            {formatAmount(data.revenue.total)}
          </div>
        </div>
        <div className="rounded-lg border bg-red-50 p-4">
          <div className="text-sm font-semibold text-red-800 mb-2">營業費用</div>
          <div className="text-2xl font-bold text-red-700">
            {formatAmount(data.expenses.total)}
          </div>
        </div>
        <div className={`rounded-lg border p-4 ${data.netIncome >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
          <div className={`text-sm font-semibold mb-2 ${data.netIncome >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
            本期淨利
          </div>
          <div className={`text-2xl font-bold ${data.netIncome >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
            {formatAmount(data.netIncome)}
          </div>
        </div>
      </div>

      {/* 收入明細 */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-green-800">營業收入明細</h3>
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
              <TableCell colSpan={2} className="font-semibold text-green-800">收入合計</TableCell>
              <TableCell className="text-right font-bold text-green-700">{formatAmount(data.revenue.total)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* 費用明細 */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-red-800">營業費用明細</h3>
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
              <TableCell colSpan={2} className="font-semibold text-red-800">費用合計</TableCell>
              <TableCell className="text-right font-bold text-red-700">{formatAmount(data.expenses.total)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* 淨利區塊 */}
      <div className={`p-6 rounded-xl ${data.netIncome >= 0 ? 'bg-gradient-to-r from-green-100 to-blue-100' : 'bg-gradient-to-r from-orange-100 to-red-100'}`}>
        <div className="flex justify-between items-center">
          <span className="text-xl font-bold">本期淨利</span>
          <span className={`text-3xl font-bold ${data.netIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
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
            <TableCell colSpan={2} className={`font-semibold ${colorClass}`}>{title}合計</TableCell>
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
