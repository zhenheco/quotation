'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useCreateInvoice } from '@/hooks/accounting'
import { useCompany } from '@/hooks/useCompany'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { CreateInvoiceInput, InvoiceType } from '@/lib/dal/accounting'

interface InvoiceFormProps {
  locale: string
}

// 共用 input 樣式
const inputClassName = 'block w-full px-4 py-3 text-sm border-2 rounded-2xl bg-white text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 hover:border-slate-300 border-slate-200'
const labelClassName = 'block text-sm font-medium text-slate-700 mb-2'

/**
 * 發票新增/編輯表單
 */
export default function InvoiceForm({ locale }: InvoiceFormProps) {
  const t = useTranslations()
  const router = useRouter()
  const { company } = useCompany()
  const createInvoice = useCreateInvoice()

  // 表單狀態
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!company?.id) {
      toast.error(t('common.selectCompanyFirst'))
      return
    }

    if (!formData.number.trim()) {
      toast.error(t('accounting.form.numberRequired'))
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
      toast.success(t('accounting.form.createSuccess'))
      router.push(`/${locale}/accounting/invoices`)
    } catch (error) {
      console.error('Error creating invoice:', error)
      const message = error instanceof Error ? error.message : t('accounting.form.createError')
      toast.error(message)
    }
  }

  const isSubmitting = createInvoice.isPending

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* 發票類型與編號 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className={labelClassName}>
                {t('accounting.invoices.type')}
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as InvoiceType })}
                className={inputClassName}
              >
                <option value="OUTPUT">{t('accounting.invoiceTypes.output')}</option>
                <option value="INPUT">{t('accounting.invoiceTypes.input')}</option>
              </select>
            </div>

            <div>
              <label htmlFor="number" className={labelClassName}>
                {t('accounting.invoices.invoiceNumber')} <span className="text-red-500">*</span>
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
                {t('accounting.invoices.date')} <span className="text-red-500">*</span>
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
                {t('accounting.form.dueDate')}
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
                {t('accounting.invoices.counterparty')}
              </label>
              <input
                type="text"
                id="counterpartyName"
                value={formData.counterpartyName}
                onChange={(e) => setFormData({ ...formData, counterpartyName: e.target.value })}
                placeholder={t('accounting.form.counterpartyPlaceholder')}
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor="counterpartyTaxId" className={labelClassName}>
                {t('accounting.form.taxId')}
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
                {t('accounting.form.untaxedAmount')} <span className="text-red-500">*</span>
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
                {t('accounting.form.taxAmount')}
              </label>
              <input
                type="number"
                id="taxAmount"
                min="0"
                step="1"
                value={formData.taxAmount}
                onChange={(e) => setFormData({
                  ...formData,
                  taxAmount: e.target.value,
                  totalAmount: (parseFloat(formData.untaxedAmount) + parseFloat(e.target.value)).toString(),
                })}
                placeholder="0"
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor="totalAmount" className={labelClassName}>
                {t('accounting.form.totalAmount')}
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
              {t('accounting.journals.description')}
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('accounting.form.descriptionPlaceholder')}
              rows={3}
              className={inputClassName}
            />
          </div>

          {/* 按鈕 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/${locale}/accounting/invoices`)}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
