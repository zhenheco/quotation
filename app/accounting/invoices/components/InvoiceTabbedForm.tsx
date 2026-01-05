'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Tabs from '@radix-ui/react-tabs'
import { toast } from 'sonner'
import { useCreateInvoice } from '@/hooks/accounting'
import { useCompany } from '@/hooks/useCompany'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import InvoiceUpload from '../InvoiceUpload'
import InvoiceScan from './InvoiceScan'
import type { CreateInvoiceInput, InvoiceType } from '@/lib/dal/accounting'

// 共用 input 樣式
const inputClassName =
  'block w-full px-4 py-3 text-sm border-2 rounded-2xl bg-white text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 hover:border-slate-300 border-slate-200'
const labelClassName = 'block text-sm font-medium text-slate-700 mb-2'

// Tab 按鈕樣式
const tabTriggerClassName = `
  flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all
  rounded-t-xl border-b-2 border-transparent
  data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-600 data-[state=active]:bg-white
  data-[state=inactive]:text-slate-500 data-[state=inactive]:hover:text-slate-700 data-[state=inactive]:hover:bg-slate-50
`

/**
 * 發票新增表單（Tab 介面）
 * 包含三種輸入方式：手動輸入、Excel 上傳、AI 掃描
 */
export default function InvoiceTabbedForm() {
  const router = useRouter()
  const { company } = useCompany()
  const createInvoice = useCreateInvoice()

  // 目前選中的 Tab
  const [activeTab, setActiveTab] = useState('manual')

  // 手動輸入的表單狀態
  const [formData, setFormData] = useState({
    number: '',
    type: 'OUTPUT' as InvoiceType,
    date: new Date().toISOString().split('T')[0],
    untaxedAmount: '',
    taxAmount: '',
    totalAmount: '',
    counterpartyName: '',
    counterpartyTaxId: '',
    description: '',
    dueDate: '',
  })

  // 稅率計算（預設 5%）
  const handleUntaxedChange = (value: string) => {
    const untaxed = parseFloat(value) || 0
    const tax = Math.round(untaxed * 0.05)
    const total = untaxed + tax
    setFormData({
      ...formData,
      untaxedAmount: value,
      taxAmount: tax.toString(),
      totalAmount: total.toString(),
    })
  }

  // 手動輸入表單提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!company?.id) {
      toast.error('請先選擇公司')
      return
    }

    if (!formData.number.trim()) {
      toast.error('請輸入發票號碼')
      return
    }

    try {
      const input: CreateInvoiceInput = {
        company_id: company.id,
        number: formData.number.trim(),
        type: formData.type,
        date: formData.date,
        untaxed_amount: parseFloat(formData.untaxedAmount) || 0,
        tax_amount: parseFloat(formData.taxAmount) || 0,
        total_amount: parseFloat(formData.totalAmount) || 0,
        counterparty_name: formData.counterpartyName.trim() || undefined,
        counterparty_tax_id: formData.counterpartyTaxId.trim() || undefined,
        description: formData.description.trim() || undefined,
        due_date: formData.dueDate || undefined,
      }

      await createInvoice.mutateAsync(input)
      toast.success('發票建立成功')
      router.push('/accounting/invoices')
    } catch (error) {
      console.error('Error creating invoice:', error)
      const message = error instanceof Error ? error.message : '發票建立失敗'
      toast.error(message)
    }
  }

  const isSubmitting = createInvoice.isPending

  // 成功回調（用於 Excel 和 AI 掃描）
  const handleSuccess = () => {
    router.push('/accounting/invoices')
  }

  // 渲染手動輸入表單
  const renderManualForm = () => (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* 發票類型與編號 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="type" className={labelClassName}>
              發票類型
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as InvoiceType })}
              className={inputClassName}
            >
              <option value="OUTPUT">銷項發票</option>
              <option value="INPUT">進項發票</option>
            </select>
          </div>

          <div>
            <label htmlFor="number" className={labelClassName}>
              發票號碼 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="number"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              placeholder="AA-12345678"
              required
              className={inputClassName}
            />
          </div>
        </div>

        {/* 日期 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className={labelClassName}>
              發票日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="dueDate" className={labelClassName}>
              到期日
            </label>
            <input
              type="date"
              id="dueDate"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className={inputClassName}
            />
          </div>
        </div>

        {/* 交易對象 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="counterpartyName" className={labelClassName}>
              交易對象
            </label>
            <input
              type="text"
              id="counterpartyName"
              value={formData.counterpartyName}
              onChange={(e) => setFormData({ ...formData, counterpartyName: e.target.value })}
              placeholder="輸入公司名稱"
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="counterpartyTaxId" className={labelClassName}>
              統一編號
            </label>
            <input
              type="text"
              id="counterpartyTaxId"
              value={formData.counterpartyTaxId}
              onChange={(e) => setFormData({ ...formData, counterpartyTaxId: e.target.value })}
              placeholder="12345678"
              className={inputClassName}
            />
          </div>
        </div>

        {/* 金額 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="untaxedAmount" className={labelClassName}>
              未稅金額 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="untaxedAmount"
              min="0"
              step="1"
              value={formData.untaxedAmount}
              onChange={(e) => handleUntaxedChange(e.target.value)}
              placeholder="0"
              required
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="taxAmount" className={labelClassName}>
              稅額
            </label>
            <input
              type="number"
              id="taxAmount"
              min="0"
              step="1"
              value={formData.taxAmount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  taxAmount: e.target.value,
                  totalAmount: (
                    parseFloat(formData.untaxedAmount) + parseFloat(e.target.value)
                  ).toString(),
                })
              }
              placeholder="0"
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="totalAmount" className={labelClassName}>
              含稅金額
            </label>
            <input
              type="number"
              id="totalAmount"
              min="0"
              step="1"
              value={formData.totalAmount}
              onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
              placeholder="0"
              className={`${inputClassName} font-medium`}
            />
          </div>
        </div>

        {/* 摘要 */}
        <div>
          <label htmlFor="description" className={labelClassName}>
            摘要
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="輸入交易說明"
            rows={3}
            className={inputClassName}
          />
        </div>

        {/* 按鈕 */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/accounting/invoices')}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '儲存中...' : '儲存'}
          </Button>
        </div>
      </div>
    </form>
  )

  return (
    <Card>
      <CardContent className="p-0">
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          {/* Tab 列表 */}
          <Tabs.List className="flex border-b bg-slate-50 rounded-t-xl">
            <Tabs.Trigger value="manual" className={tabTriggerClassName}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              手動輸入
            </Tabs.Trigger>

            <Tabs.Trigger value="excel" className={tabTriggerClassName}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Excel 匯入
            </Tabs.Trigger>

            <Tabs.Trigger value="scan" className={tabTriggerClassName}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              AI 掃描
            </Tabs.Trigger>
          </Tabs.List>

          {/* Tab 內容 */}
          <div className="p-6">
            <Tabs.Content value="manual" className="focus:outline-none">
              {renderManualForm()}
            </Tabs.Content>

            <Tabs.Content value="excel" className="focus:outline-none">
              <InvoiceUpload onSuccess={handleSuccess} />
            </Tabs.Content>

            <Tabs.Content value="scan" className="focus:outline-none">
              <InvoiceScan onSuccess={handleSuccess} />
            </Tabs.Content>
          </div>
        </Tabs.Root>
      </CardContent>
    </Card>
  )
}
