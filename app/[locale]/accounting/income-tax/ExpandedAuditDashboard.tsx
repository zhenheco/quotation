'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useCompany } from '@/hooks/useCompany'
import {
  useExpandedAuditPreview,
  useIncomeTaxFilings,
  useProfitRates,
  useCalculateAndSave,
  type IndustryProfitRate,
  type IncomeTaxFiling,
  type ExpandedAuditResult,
} from '@/hooks/accounting'
import { formatAmount } from '@/lib/utils/formatters'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// 顏色設定
const COLORS = {
  revenue: '#3b82f6', // 藍色 - 營收
  taxable: '#10b981', // 綠色 - 課稅所得
  tax: '#f59e0b', // 橙色 - 稅額
  eligible: '#22c55e', // 綠色 - 符合資格
  ineligible: '#ef4444', // 紅色 - 不符合資格
}

/**
 * 營所稅擴大書審儀表板
 */
export default function ExpandedAuditDashboard() {
  const t = useTranslations()
  const { company } = useCompany()

  // 申報年度選擇
  const currentYear = new Date().getFullYear()
  const [taxYear, setTaxYear] = useState(currentYear - 1) // 預設申報上一年度
  const [activeTab, setActiveTab] = useState<'calculator' | 'history' | 'profit-rates'>('calculator')

  // 行業選擇
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryProfitRate | null>(null)
  const [industrySearch, setIndustrySearch] = useState('')

  // 額外輸入
  const [otherIncome, setOtherIncome] = useState(0)
  const [deductions, setDeductions] = useState(0)

  // 年度選項（最近 5 年）
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 - i)

  // 預覽參數
  const previewParams = useMemo(() => {
    if (!company?.id) return null
    return {
      companyId: company.id,
      companyName: company.name || '',
      companyTaxId: company.tax_id || '',
      taxYear,
      industryCode: selectedIndustry?.industry_code,
    }
  }, [company, taxYear, selectedIndustry])

  // 取得預覽計算
  const { data: previewData, isLoading: previewLoading, refetch: refetchPreview } = useExpandedAuditPreview(
    previewParams,
    !!company?.id
  )

  // 取得申報記錄
  const { data: filings, isLoading: filingsLoading } = useIncomeTaxFilings(company?.id ?? null, !!company?.id)

  // 取得純益率列表
  const { data: profitRates, isLoading: profitRatesLoading } = useProfitRates(taxYear, industrySearch || undefined)

  // 計算並儲存
  const calculateAndSave = useCalculateAndSave()

  // 過濾純益率
  const filteredProfitRates = useMemo(() => {
    if (!profitRates) return []
    if (!industrySearch) return profitRates.slice(0, 20) // 預設顯示前 20 筆
    return profitRates
  }, [profitRates, industrySearch])

  // 處理選擇行業
  const handleSelectIndustry = useCallback((rate: IndustryProfitRate) => {
    setSelectedIndustry(rate)
    setIndustrySearch('')
  }, [])

  // 處理儲存申報
  const handleSaveCalculation = useCallback(async () => {
    if (!company?.id || !selectedIndustry) return

    try {
      await calculateAndSave.mutateAsync({
        company_id: company.id,
        company_name: company.name || '',
        tax_id: company.tax_id || '',
        tax_year: taxYear,
        industry_code: selectedIndustry.industry_code,
        other_income: otherIncome,
        deductions: deductions,
      })
    } catch (error) {
      console.error('Save calculation failed:', error)
    }
  }, [company, selectedIndustry, taxYear, otherIncome, deductions, calculateAndSave])

  if (!company?.id) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t('common.selectCompanyFirst')}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 標題與說明 */}
      <div>
        <h1 className="text-2xl font-bold">{t('accounting.incomeTax.expandedAuditTitle')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('accounting.incomeTax.expandedAuditDesc')}
        </p>
      </div>

      {/* 年度選擇 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('accounting.incomeTax.taxYear')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                {t('accounting.incomeTax.selectYear')}
              </label>
              <select
                value={taxYear}
                onChange={(e) => {
                  setTaxYear(parseInt(e.target.value, 10))
                  setSelectedIndustry(null)
                }}
                className="flex h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y} 年度
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={() => refetchPreview()} variant="outline" size="sm">
              {t('accounting.incomeTax.preview')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 主要內容 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
          <TabsTrigger value="calculator">{t('accounting.incomeTax.calculation')}</TabsTrigger>
          <TabsTrigger value="history">{t('accounting.incomeTax.filingHistory')}</TabsTrigger>
          <TabsTrigger value="profit-rates">{t('accounting.profitRates.title')}</TabsTrigger>
        </TabsList>

        {/* 計算器 */}
        <TabsContent value="calculator">
          <CalculatorSection
            t={t}
            previewData={previewData}
            previewLoading={previewLoading}
            selectedIndustry={selectedIndustry}
            onSelectIndustry={handleSelectIndustry}
            industrySearch={industrySearch}
            onIndustrySearchChange={setIndustrySearch}
            filteredProfitRates={filteredProfitRates}
            profitRatesLoading={profitRatesLoading}
            otherIncome={otherIncome}
            onOtherIncomeChange={setOtherIncome}
            deductions={deductions}
            onDeductionsChange={setDeductions}
            onSave={handleSaveCalculation}
            isSaving={calculateAndSave.isPending}
            saveSuccess={calculateAndSave.isSuccess}
          />
        </TabsContent>

        {/* 歷史記錄 */}
        <TabsContent value="history">
          <HistorySection t={t} filings={filings} isLoading={filingsLoading} />
        </TabsContent>

        {/* 純益率查詢 */}
        <TabsContent value="profit-rates">
          <ProfitRatesSection
            t={t}
            profitRates={profitRates}
            isLoading={profitRatesLoading}
            search={industrySearch}
            onSearchChange={setIndustrySearch}
            taxYear={taxYear}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================
// 計算器區塊
// ============================================

interface CalculatorSectionProps {
  t: ReturnType<typeof useTranslations>
  previewData: {
    tax_year: number
    revenue_summary: {
      year: number
      total_revenue: number
      total_tax: number
      invoice_count: number
      by_month: Array<{ month: number; revenue: number; tax: number; count: number }>
    }
    eligibility: {
      is_eligible: boolean
      reason?: string
      details: { total_revenue: number; revenue_limit: number; exceeds_limit: boolean }
    }
    revenue_limit: number
    result?: ExpandedAuditResult
  } | undefined
  previewLoading: boolean
  selectedIndustry: IndustryProfitRate | null
  onSelectIndustry: (rate: IndustryProfitRate) => void
  industrySearch: string
  onIndustrySearchChange: (search: string) => void
  filteredProfitRates: IndustryProfitRate[]
  profitRatesLoading: boolean
  otherIncome: number
  onOtherIncomeChange: (value: number) => void
  deductions: number
  onDeductionsChange: (value: number) => void
  onSave: () => void
  isSaving: boolean
  saveSuccess: boolean
}

function CalculatorSection({
  t,
  previewData,
  previewLoading,
  selectedIndustry,
  onSelectIndustry,
  industrySearch,
  onIndustrySearchChange,
  filteredProfitRates,
  profitRatesLoading,
  otherIncome,
  onOtherIncomeChange,
  deductions,
  onDeductionsChange,
  onSave,
  isSaving,
  saveSuccess,
}: CalculatorSectionProps) {
  if (previewLoading) {
    return (
      <Card className="mt-4">
        <CardContent className="flex justify-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    )
  }

  if (!previewData) {
    return (
      <Card className="mt-4">
        <CardContent className="py-12 text-center text-muted-foreground">
          {t('accounting.incomeTax.calculateFirst')}
        </CardContent>
      </Card>
    )
  }

  const { revenue_summary, eligibility, result } = previewData

  // 月份營收圖表資料
  const monthlyChartData = revenue_summary.by_month.map((m) => ({
    name: `${m.month}月`,
    revenue: m.revenue,
    count: m.count,
  }))

  return (
    <div className="space-y-6 mt-4">
      {/* 營收匯總 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('accounting.incomeTax.revenueSummary')}</CardTitle>
          <CardDescription>
            {t('accounting.incomeTax.invoiceCount')}: {revenue_summary.invoice_count}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* 全年營業收入 */}
            <div className="rounded-lg border bg-blue-50 p-4">
              <div className="text-sm font-semibold text-blue-800 mb-2">
                {t('accounting.incomeTax.totalRevenue')}
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {formatAmount(revenue_summary.total_revenue)}
              </div>
            </div>

            {/* 資格狀態 */}
            <div
              className={`rounded-lg border p-4 ${
                eligibility.is_eligible ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              <div
                className={`text-sm font-semibold mb-2 ${
                  eligibility.is_eligible ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {eligibility.is_eligible
                  ? t('accounting.incomeTax.eligible')
                  : t('accounting.incomeTax.notEligible')}
              </div>
              <div
                className={`text-sm ${
                  eligibility.is_eligible ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {eligibility.is_eligible
                  ? t('accounting.incomeTax.expandedAuditDesc')
                  : eligibility.reason}
              </div>
            </div>

            {/* 上限說明 */}
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="text-sm font-semibold text-gray-800 mb-2">
                {t('accounting.incomeTax.revenueLimit')}
              </div>
              <div className="text-2xl font-bold text-gray-700">
                {formatAmount(eligibility.details.revenue_limit)}
              </div>
            </div>
          </div>

          {/* 月份圖表 */}
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-3">{t('accounting.incomeTax.byMonth')}</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => formatAmount(v)} />
                <Tooltip formatter={(value: number) => formatAmount(value)} />
                <Bar dataKey="revenue" fill={COLORS.revenue} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 行業選擇與計算 */}
      {eligibility.is_eligible && (
        <Card>
          <CardHeader>
            <CardTitle>{t('accounting.incomeTax.selectIndustry')}</CardTitle>
            <CardDescription>{t('accounting.incomeTax.profitRateDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 搜尋 */}
            <div className="flex gap-4">
              <Input
                placeholder={t('accounting.incomeTax.searchIndustry')}
                value={industrySearch}
                onChange={(e) => onIndustrySearchChange(e.target.value)}
                className="flex-1"
              />
            </div>

            {/* 已選擇的行業 */}
            {selectedIndustry && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-mono text-sm mr-2">{selectedIndustry.industry_code}</span>
                    <span className="font-medium">{selectedIndustry.industry_name}</span>
                  </div>
                  <div className="text-lg font-bold text-primary">
                    {(selectedIndustry.profit_rate * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            )}

            {/* 行業列表 */}
            {!selectedIndustry && (
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                {profitRatesLoading ? (
                  <div className="p-4 text-center">
                    <LoadingSpinner />
                  </div>
                ) : filteredProfitRates.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    {t('common.noResults')}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">{t('accounting.profitRates.code')}</TableHead>
                        <TableHead>{t('accounting.profitRates.name')}</TableHead>
                        <TableHead className="text-right w-24">
                          {t('accounting.profitRates.rate')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProfitRates.map((rate) => (
                        <TableRow
                          key={rate.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => onSelectIndustry(rate)}
                        >
                          <TableCell className="font-mono">{rate.industry_code}</TableCell>
                          <TableCell>{rate.industry_name}</TableCell>
                          <TableCell className="text-right font-medium">
                            {(rate.profit_rate * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {/* 額外輸入 */}
            {selectedIndustry && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="text-sm font-medium">{t('accounting.incomeTax.otherIncome')}</label>
                  <Input
                    type="number"
                    value={otherIncome}
                    onChange={(e) => onOtherIncomeChange(parseInt(e.target.value, 10) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('accounting.incomeTax.deductions')}</label>
                  <Input
                    type="number"
                    value={deductions}
                    onChange={(e) => onDeductionsChange(parseInt(e.target.value, 10) || 0)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 計算結果 */}
      {result && result.is_eligible && (
        <Card>
          <CardHeader>
            <CardTitle>{t('accounting.incomeTax.calculation')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* 計算明細表格 */}
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">{t('accounting.incomeTax.totalRevenue')}</TableCell>
                    <TableCell className="text-right">{result.summary.total_revenue_display}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      {t('accounting.incomeTax.profitRate')} ({result.calculation.industry_name})
                    </TableCell>
                    <TableCell className="text-right">{result.calculation.profit_rate_display}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">{t('accounting.incomeTax.taxableIncomeFromBusiness')}</TableCell>
                    <TableCell className="text-right">
                      {formatAmount(result.calculation.taxable_income_from_business)}
                    </TableCell>
                  </TableRow>
                  {result.calculation.other_income > 0 && (
                    <TableRow>
                      <TableCell className="font-medium">{t('accounting.incomeTax.otherIncome')}</TableCell>
                      <TableCell className="text-right">
                        {formatAmount(result.calculation.other_income)}
                      </TableCell>
                    </TableRow>
                  )}
                  {result.calculation.deductions > 0 && (
                    <TableRow>
                      <TableCell className="font-medium">{t('accounting.incomeTax.deductions')}</TableCell>
                      <TableCell className="text-right">
                        -{formatAmount(result.calculation.deductions)}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-semibold">{t('accounting.incomeTax.taxableIncome')}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {result.summary.taxable_income_display}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* 稅額計算說明 */}
              <div className="p-4 rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground mb-2">
                  {result.calculation.tax_calculation_description}
                </p>
                <div className="flex items-center justify-between">
                  <TaxTypeBadge type={result.calculation.tax_calculation_type} t={t} />
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">{t('accounting.incomeTax.finalTax')}</div>
                    <div className="text-2xl font-bold text-primary">
                      {result.summary.tax_amount_display}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('accounting.incomeTax.effectiveTaxRate')}: {result.summary.effective_tax_rate}
                    </div>
                  </div>
                </div>
              </div>

              {/* 儲存按鈕 */}
              <div className="flex justify-end gap-2">
                <Button onClick={onSave} disabled={isSaving}>
                  {isSaving ? t('common.saving') : t('accounting.incomeTax.save')}
                </Button>
              </div>
              {saveSuccess && (
                <p className="text-sm text-green-600 text-right">{t('accounting.incomeTax.saveSuccess')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================
// 歷史記錄區塊
// ============================================

interface HistorySectionProps {
  t: ReturnType<typeof useTranslations>
  filings: IncomeTaxFiling[] | undefined
  isLoading: boolean
}

function HistorySection({ t, filings, isLoading }: HistorySectionProps) {
  if (isLoading) {
    return (
      <Card className="mt-4">
        <CardContent className="flex justify-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    )
  }

  if (!filings || filings.length === 0) {
    return (
      <Card className="mt-4">
        <CardContent className="py-12 text-center text-muted-foreground">
          {t('accounting.incomeTax.noFilings')}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>{t('accounting.incomeTax.filingHistory')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('accounting.incomeTax.taxYear')}</TableHead>
              <TableHead>{t('accounting.incomeTax.totalRevenue')}</TableHead>
              <TableHead>{t('accounting.incomeTax.taxableIncome')}</TableHead>
              <TableHead>{t('accounting.incomeTax.finalTax')}</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filings.map((filing) => (
              <TableRow key={filing.id}>
                <TableCell className="font-medium">{filing.tax_year} 年度</TableCell>
                <TableCell>{formatAmount(filing.total_revenue)}</TableCell>
                <TableCell>{formatAmount(filing.taxable_income)}</TableCell>
                <TableCell className="font-semibold">{formatAmount(filing.final_tax)}</TableCell>
                <TableCell>
                  <FilingStatusBadge status={filing.status} t={t} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    {t('accounting.incomeTax.viewDetail')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ============================================
// 純益率查詢區塊
// ============================================

interface ProfitRatesSectionProps {
  t: ReturnType<typeof useTranslations>
  profitRates: IndustryProfitRate[] | undefined
  isLoading: boolean
  search: string
  onSearchChange: (search: string) => void
  taxYear: number
}

function ProfitRatesSection({
  t,
  profitRates,
  isLoading,
  search,
  onSearchChange,
  taxYear,
}: ProfitRatesSectionProps) {
  // 按類別分組
  const groupedRates = useMemo(() => {
    if (!profitRates) return {}
    const grouped: Record<string, IndustryProfitRate[]> = {}
    for (const rate of profitRates) {
      const category = rate.industry_category || '其他'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(rate)
    }
    return grouped
  }, [profitRates])

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>{t('accounting.profitRates.title')}</CardTitle>
        <CardDescription>
          {t('accounting.profitRates.taxYearLabel')}: {taxYear}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* 搜尋 */}
        <div className="mb-4">
          <Input
            placeholder={t('accounting.profitRates.search')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : !profitRates || profitRates.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {t('common.noResults')}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedRates).map(([category, rates]) => (
              <div key={category}>
                <h4 className="font-semibold text-sm text-muted-foreground mb-2">{category}</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">{t('accounting.profitRates.code')}</TableHead>
                      <TableHead>{t('accounting.profitRates.name')}</TableHead>
                      <TableHead className="text-right w-24">{t('accounting.profitRates.rate')}</TableHead>
                      <TableHead className="text-right w-32">{t('accounting.profitRates.source')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rates.map((rate) => (
                      <TableRow key={rate.id}>
                        <TableCell className="font-mono">{rate.industry_code}</TableCell>
                        <TableCell>{rate.industry_name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {(rate.profit_rate * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {rate.source || t('accounting.profitRates.defaultData')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 輔助元件
// ============================================

function TaxTypeBadge({
  type,
  t,
}: {
  type: 'TAX_FREE' | 'HALF_TAX' | 'FULL_TAX'
  t: ReturnType<typeof useTranslations>
}) {
  const config = {
    TAX_FREE: { label: t('accounting.incomeTax.taxFree'), className: 'bg-green-100 text-green-800' },
    HALF_TAX: { label: t('accounting.incomeTax.halfTax'), className: 'bg-amber-100 text-amber-800' },
    FULL_TAX: { label: t('accounting.incomeTax.fullTax'), className: 'bg-blue-100 text-blue-800' },
  }

  const { label, className } = config[type]

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${className}`}>
      {label}
    </span>
  )
}

function FilingStatusBadge({
  status,
  t,
}: {
  status: IncomeTaxFiling['status']
  t: ReturnType<typeof useTranslations>
}) {
  const config = {
    DRAFT: { label: t('accounting.incomeTax.status.draft'), className: 'bg-gray-100 text-gray-800' },
    CALCULATED: { label: t('accounting.incomeTax.status.calculated'), className: 'bg-blue-100 text-blue-800' },
    SUBMITTED: { label: t('accounting.incomeTax.status.submitted'), className: 'bg-amber-100 text-amber-800' },
    ACCEPTED: { label: t('accounting.incomeTax.status.accepted'), className: 'bg-green-100 text-green-800' },
    REJECTED: { label: t('accounting.incomeTax.status.rejected'), className: 'bg-red-100 text-red-800' },
  }

  const { label, className } = config[status]

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
