'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { useCompany } from '@/hooks/useCompany'
import { useForm401, useDownloadTaxXml, useDownloadMediaFile, type TaxReportParams } from '@/hooks/accounting'
import { formatAmount } from '@/lib/utils/formatters'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { Form401Data } from '@/lib/services/accounting/tax-report.service'

// 顏色設定
const COLORS = {
  taxable: '#3b82f6', // 藍色 - 應稅
  zeroRated: '#10b981', // 綠色 - 零稅率
  exempt: '#f59e0b', // 橙色 - 免稅
  deductible: '#8b5cf6', // 紫色 - 可扣抵
  nonDeductible: '#ef4444', // 紅色 - 不可扣抵
}

/**
 * 從可能是物件或字串的公司名稱中提取字串
 * 處理多語言物件 {en: 'xxx', zh: 'xxx'} 或嵌套結構
 */
function getCompanyNameString(name: unknown, locale: string = 'zh'): string {
  // 已經是字串，直接返回
  if (typeof name === 'string') return name

  // 是物件，嘗試提取
  if (name && typeof name === 'object') {
    const obj = name as Record<string, unknown>

    // 優先嘗試當前語系
    if (locale in obj && typeof obj[locale] === 'string') {
      return obj[locale] as string
    }

    // 回退到中文
    if ('zh' in obj && typeof obj.zh === 'string') {
      return obj.zh as string
    }

    // 回退到英文
    if ('en' in obj && typeof obj.en === 'string') {
      return obj.en as string
    }

    // 嘗試 name 屬性
    if ('name' in obj && typeof obj.name === 'string') {
      return obj.name as string
    }

    // 嘗試取第一個字串值
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string') {
        return obj[key] as string
      }
    }
  }

  return ''
}

/**
 * 營業稅申報儀表板
 */
export default function TaxReportDashboard() {
  const { company } = useCompany()

  // 申報期間選擇
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  // 計算當前雙月期（1月2月=1, 3月4月=2, ...）
  const currentBiMonth = Math.ceil(currentMonth / 2)

  const [year, setYear] = useState(currentYear)
  const [biMonth, setBiMonth] = useState(currentBiMonth > 1 ? currentBiMonth - 1 : 6)
  const [activeTab, setActiveTab] = useState<'summary' | 'sales' | 'purchases' | 'xml'>('summary')

  // 申報參數
  const taxReportParams: TaxReportParams | null = useMemo(() => {
    if (!company?.id) return null
    // 使用輔助函數安全提取公司名稱（處理多語言物件）
    const companyName = getCompanyNameString(company.name, 'zh')
    return {
      companyId: company.id,
      taxId: company.tax_id || '',
      companyName,
      year,
      biMonth,
    }
  }, [company, year, biMonth])

  // 取得 401 申報資料
  const { data: form401, isLoading, error, refetch, isFetching } = useForm401(taxReportParams, !!company?.id)

  // XML 下載
  const downloadXml = useDownloadTaxXml()

  // 媒體檔下載
  const downloadMedia = useDownloadMediaFile()

  // 雙月期選項
  const biMonthOptions = [
    { value: 1, label: '1-2月' },
    { value: 2, label: '3-4月' },
    { value: 3, label: '5-6月' },
    { value: 4, label: '7-8月' },
    { value: 5, label: '9-10月' },
    { value: 6, label: '11-12月' },
  ]

  // 年度選項（最近 5 年）
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const handleDownloadXml = () => {
    if (!taxReportParams) {
      toast.error('無資料可下載')
      return
    }
    downloadXml.mutate(
      { params: taxReportParams, form: '401' },
      {
        onSuccess: () => {
          toast.success('下載成功')
        },
        onError: (error) => {
          console.error('XML 下載失敗:', error)
          toast.error('下載失敗: ' + (error as Error).message)
        },
      }
    )
  }

  const handleDownloadMedia = () => {
    if (!taxReportParams) {
      toast.error('無資料可下載')
      return
    }
    downloadMedia.mutate(
      { params: taxReportParams },
      {
        onSuccess: () => {
          toast.success('下載成功')
        },
        onError: (error) => {
          console.error('媒體檔下載失敗:', error)
          toast.error('下載失敗: ' + (error as Error).message)
        },
      }
    )
  }

  if (!company?.id) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          請先選擇公司
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 期間選擇器 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">申報期間</CardTitle>
          <CardDescription>選擇申報期間</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                年度
              </label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                className="flex h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                期別
              </label>
              <select
                value={biMonth}
                onChange={(e) => setBiMonth(parseInt(e.target.value, 10))}
                className="flex h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {biMonthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              disabled={isLoading || isFetching}
            >
              {isFetching ? '載入中...' : '產生報表'}
            </Button>
            <Button
              onClick={handleDownloadXml}
              variant="outline"
              size="sm"
              disabled={!form401 || downloadXml.isPending}
            >
              {downloadXml.isPending ? '下載中...' : '下載 XML'}
            </Button>
            <Button
              onClick={handleDownloadMedia}
              variant="outline"
              size="sm"
              disabled={!form401 || downloadMedia.isPending}
            >
              {downloadMedia.isPending ? '下載中...' : '下載媒體檔'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 申報內容 */}
      {isLoading ? (
        <Card>
          <CardContent className="flex justify-center py-12">
            <LoadingSpinner />
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center text-red-500">
            載入失敗
          </CardContent>
        </Card>
      ) : form401 ? (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        >
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="summary">摘要</TabsTrigger>
            <TabsTrigger value="sales">銷項明細</TabsTrigger>
            <TabsTrigger value="purchases">進項明細</TabsTrigger>
            <TabsTrigger value="xml">XML 預覽</TabsTrigger>
          </TabsList>

          {/* 摘要 */}
          <TabsContent value="summary">
            <TaxSummarySection data={form401} />
          </TabsContent>

          {/* 銷項明細 */}
          <TabsContent value="sales">
            <SalesDetailsSection data={form401} />
          </TabsContent>

          {/* 進項明細 */}
          <TabsContent value="purchases">
            <PurchasesDetailsSection data={form401} />
          </TabsContent>

          {/* XML 預覽 */}
          <TabsContent value="xml">
            <XmlPreviewSection data={form401} />
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            無申報資料
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================
// 摘要區塊
// ============================================

function TaxSummarySection({ data }: { data: Form401Data }) {
  const { sales, purchases, taxCalculation } = data

  // 銷項圓餅圖資料
  const salesChartData = [
    { name: '應稅 5%', value: sales.taxable.untaxedAmount, fill: COLORS.taxable },
    { name: '零稅率', value: sales.zeroRated.untaxedAmount, fill: COLORS.zeroRated },
    { name: '免稅', value: sales.exempt.untaxedAmount, fill: COLORS.exempt },
  ].filter((d) => d.value > 0)

  // 進項圓餅圖資料
  const purchasesChartData = [
    { name: '可扣抵', value: purchases.deductible.untaxedAmount, fill: COLORS.deductible },
    { name: '不可扣抵', value: purchases.nonDeductible.untaxedAmount, fill: COLORS.nonDeductible },
  ].filter((d) => d.value > 0)

  // 稅額計算柱狀圖
  const taxChartData = [
    { name: '銷項稅額', value: taxCalculation.outputTax, fill: '#3b82f6' },
    { name: '進項稅額', value: taxCalculation.inputTax, fill: '#10b981' },
    {
      name: taxCalculation.isRefund ? '應退稅額' : '應納稅額',
      value: taxCalculation.netTax,
      fill: taxCalculation.isRefund ? '#f59e0b' : '#ef4444',
    },
  ]

  return (
    <div className="space-y-6 mt-4">
      {/* 稅額總覽 */}
      <Card>
        <CardHeader>
          <CardTitle>稅額總覽</CardTitle>
          <CardDescription>
            {`${data.period.year} 年第 ${data.period.biMonth} 期`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 銷項稅額 */}
            <div className="rounded-lg border bg-blue-50 p-4">
              <div className="text-sm font-semibold text-blue-800 mb-2">
                銷項稅額
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {formatAmount(taxCalculation.outputTax)}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {`共 ${data.summary.totalSalesCount} 張發票`}
              </div>
            </div>

            {/* 進項稅額 */}
            <div className="rounded-lg border bg-green-50 p-4">
              <div className="text-sm font-semibold text-green-800 mb-2">
                進項稅額
              </div>
              <div className="text-2xl font-bold text-green-700">
                {formatAmount(taxCalculation.inputTax)}
              </div>
              <div className="text-xs text-green-600 mt-1">
                {`共 ${data.summary.totalPurchasesCount} 張發票`}
              </div>
            </div>

            {/* 應納/應退稅額 */}
            <div
              className={`rounded-lg border p-4 ${
                taxCalculation.isRefund ? 'bg-amber-50' : 'bg-red-50'
              }`}
            >
              <div
                className={`text-sm font-semibold mb-2 ${
                  taxCalculation.isRefund ? 'text-amber-800' : 'text-red-800'
                }`}
              >
                {taxCalculation.isRefund ? '應退稅額' : '應納稅額'}
              </div>
              <div
                className={`text-2xl font-bold ${
                  taxCalculation.isRefund ? 'text-amber-700' : 'text-red-700'
                }`}
              >
                {formatAmount(taxCalculation.netTax)}
              </div>
              <div
                className={`text-xs mt-1 ${
                  taxCalculation.isRefund ? 'text-amber-600' : 'text-red-600'
                }`}
              >
                = 銷項稅額 - 進項稅額
              </div>
            </div>
          </div>

          {/* 稅額柱狀圖 */}
          <div className="mt-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={taxChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => formatAmount(v)} />
                <Tooltip formatter={(value: number) => formatAmount(value)} />
                <Bar dataKey="value">
                  {taxChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 銷項/進項結構 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 銷項結構 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">銷項結構</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>類別</TableHead>
                  <TableHead className="text-right">筆數</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead className="text-right">稅額</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS.taxable }} />
                    應稅 5%
                  </TableCell>
                  <TableCell className="text-right">{sales.taxable.count}</TableCell>
                  <TableCell className="text-right">{formatAmount(sales.taxable.untaxedAmount)}</TableCell>
                  <TableCell className="text-right">{formatAmount(sales.taxable.taxAmount)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS.zeroRated }} />
                    零稅率
                  </TableCell>
                  <TableCell className="text-right">{sales.zeroRated.count}</TableCell>
                  <TableCell className="text-right">{formatAmount(sales.zeroRated.untaxedAmount)}</TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS.exempt }} />
                    免稅
                  </TableCell>
                  <TableCell className="text-right">{sales.exempt.count}</TableCell>
                  <TableCell className="text-right">{formatAmount(sales.exempt.untaxedAmount)}</TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">合計</TableCell>
                  <TableCell className="text-right font-semibold">
                    {sales.taxable.count + sales.zeroRated.count + sales.exempt.count}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatAmount(
                      sales.taxable.untaxedAmount +
                        sales.zeroRated.untaxedAmount +
                        sales.exempt.untaxedAmount
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatAmount(sales.taxable.taxAmount)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>

            {salesChartData.length > 0 && (
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={salesChartData}
                      cx="50%"
                      cy="50%"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      label={({ percent }: any) => `${((percent as number) * 100).toFixed(0)}%`}
                      outerRadius={70}
                      dataKey="value"
                    >
                      {salesChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatAmount(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 進項結構 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">進項結構</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>類別</TableHead>
                  <TableHead className="text-right">筆數</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead className="text-right">稅額</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS.deductible }} />
                    可扣抵
                  </TableCell>
                  <TableCell className="text-right">{purchases.deductible.count}</TableCell>
                  <TableCell className="text-right">{formatAmount(purchases.deductible.untaxedAmount)}</TableCell>
                  <TableCell className="text-right">{formatAmount(purchases.deductible.taxAmount)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS.nonDeductible }} />
                    不可扣抵
                  </TableCell>
                  <TableCell className="text-right">{purchases.nonDeductible.count}</TableCell>
                  <TableCell className="text-right">{formatAmount(purchases.nonDeductible.untaxedAmount)}</TableCell>
                  <TableCell className="text-right">{formatAmount(purchases.nonDeductible.taxAmount)}</TableCell>
                </TableRow>
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">合計</TableCell>
                  <TableCell className="text-right font-semibold">
                    {purchases.deductible.count + purchases.nonDeductible.count}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatAmount(
                      purchases.deductible.untaxedAmount + purchases.nonDeductible.untaxedAmount
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatAmount(
                      purchases.deductible.taxAmount + purchases.nonDeductible.taxAmount
                    )}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>

            {purchasesChartData.length > 0 && (
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={purchasesChartData}
                      cx="50%"
                      cy="50%"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      label={({ percent }: any) => `${((percent as number) * 100).toFixed(0)}%`}
                      outerRadius={70}
                      dataKey="value"
                    >
                      {purchasesChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatAmount(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================
// 銷項明細區塊
// ============================================

function SalesDetailsSection({ data }: { data: Form401Data }) {
  const { sales } = data
  const allSalesInvoices = [
    ...sales.taxable.invoices,
    ...sales.zeroRated.invoices,
    ...sales.exempt.invoices,
  ].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>銷項發票明細</CardTitle>
        <CardDescription>
          {`共 ${allSalesInvoices.length} 筆`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>發票號碼</TableHead>
              <TableHead>日期</TableHead>
              <TableHead>交易對象</TableHead>
              <TableHead>統一編號</TableHead>
              <TableHead className="text-right">未稅金額</TableHead>
              <TableHead className="text-right">稅額</TableHead>
              <TableHead>稅別</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allSalesInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  無發票資料
                </TableCell>
              </TableRow>
            ) : (
              allSalesInvoices.map((inv) => (
                <TableRow key={inv.invoiceId}>
                  <TableCell className="font-mono">{inv.invoiceNumber}</TableCell>
                  <TableCell>{inv.date}</TableCell>
                  <TableCell>{inv.counterpartyName || '-'}</TableCell>
                  <TableCell className="font-mono">{inv.counterpartyTaxId || '-'}</TableCell>
                  <TableCell className="text-right">{formatAmount(inv.untaxedAmount)}</TableCell>
                  <TableCell className="text-right">{formatAmount(inv.taxAmount)}</TableCell>
                  <TableCell>
                    <TaxCategoryBadge category={inv.taxCategory} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ============================================
// 進項明細區塊
// ============================================

function PurchasesDetailsSection({ data }: { data: Form401Data }) {
  const { purchases } = data
  const allPurchasesInvoices = [
    ...purchases.deductible.invoices,
    ...purchases.nonDeductible.invoices,
  ].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>進項發票明細</CardTitle>
        <CardDescription>
          {`共 ${allPurchasesInvoices.length} 筆`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>發票號碼</TableHead>
              <TableHead>日期</TableHead>
              <TableHead>交易對象</TableHead>
              <TableHead>統一編號</TableHead>
              <TableHead className="text-right">未稅金額</TableHead>
              <TableHead className="text-right">稅額</TableHead>
              <TableHead>扣抵性</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allPurchasesInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  無發票資料
                </TableCell>
              </TableRow>
            ) : (
              allPurchasesInvoices.map((inv) => {
                const isDeductible = purchases.deductible.invoices.some(
                  (d) => d.invoiceId === inv.invoiceId
                )
                return (
                  <TableRow key={inv.invoiceId}>
                    <TableCell className="font-mono">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.date}</TableCell>
                    <TableCell>{inv.counterpartyName || '-'}</TableCell>
                    <TableCell className="font-mono">{inv.counterpartyTaxId || '-'}</TableCell>
                    <TableCell className="text-right">{formatAmount(inv.untaxedAmount)}</TableCell>
                    <TableCell className="text-right">{formatAmount(inv.taxAmount)}</TableCell>
                    <TableCell>
                      {isDeductible ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          可扣抵
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          不可扣抵
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ============================================
// XML 預覽區塊
// ============================================

function XmlPreviewSection({ data }: { data: Form401Data }) {
  const formatAmount = (n: number): string => Math.round(n).toString()

  // 產生簡化的 XML 預覽
  // 使用輔助函數安全提取公司名稱
  const safeCompanyName = getCompanyNameString(data.companyInfo.companyName, 'zh')
  const xmlPreview = `<?xml version="1.0" encoding="UTF-8"?>
<VAT401>
  <Header>
    <Year>${data.period.year}</Year>
    <Period>${String(data.period.biMonth).padStart(2, '0')}</Period>
    <TaxId>${data.companyInfo.taxId}</TaxId>
    <CompanyName>${safeCompanyName}</CompanyName>
  </Header>
  <Sales>
    <Taxable>
      <Count>${data.sales.taxable.count}</Count>
      <UntaxedAmount>${formatAmount(data.sales.taxable.untaxedAmount)}</UntaxedAmount>
      <TaxAmount>${formatAmount(data.sales.taxable.taxAmount)}</TaxAmount>
    </Taxable>
    <ZeroRated>
      <Count>${data.sales.zeroRated.count}</Count>
      <Amount>${formatAmount(data.sales.zeroRated.untaxedAmount)}</Amount>
    </ZeroRated>
    <Exempt>
      <Count>${data.sales.exempt.count}</Count>
      <Amount>${formatAmount(data.sales.exempt.untaxedAmount)}</Amount>
    </Exempt>
  </Sales>
  <Purchases>
    <Deductible>
      <Count>${data.purchases.deductible.count}</Count>
      <UntaxedAmount>${formatAmount(data.purchases.deductible.untaxedAmount)}</UntaxedAmount>
      <TaxAmount>${formatAmount(data.purchases.deductible.taxAmount)}</TaxAmount>
    </Deductible>
  </Purchases>
  <TaxCalculation>
    <OutputTax>${formatAmount(data.taxCalculation.outputTax)}</OutputTax>
    <InputTax>${formatAmount(data.taxCalculation.inputTax)}</InputTax>
    <NetTax>${formatAmount(data.taxCalculation.netTax)}</NetTax>
    <IsRefund>${data.taxCalculation.isRefund ? 'Y' : 'N'}</IsRefund>
  </TaxCalculation>
</VAT401>`

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>XML 預覽</CardTitle>
        <CardDescription>申報 XML 內容預覽</CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm font-mono">
          {xmlPreview}
        </pre>
      </CardContent>
    </Card>
  )
}

// ============================================
// 輔助元件
// ============================================

function TaxCategoryBadge({ category }: { category: string }) {
  const config: Record<string, { label: string; className: string }> = {
    TAXABLE_5: {
      label: '應稅 5%',
      className: 'bg-blue-100 text-blue-800',
    },
    ZERO_RATED: {
      label: '零稅率',
      className: 'bg-green-100 text-green-800',
    },
    EXEMPT: {
      label: '免稅',
      className: 'bg-amber-100 text-amber-800',
    },
    NON_TAXABLE: {
      label: '非課稅',
      className: 'bg-gray-100 text-gray-800',
    },
  }

  const { label, className } = config[category] || config.NON_TAXABLE

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}
