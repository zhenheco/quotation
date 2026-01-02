'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useInvoice, useUpdateInvoice } from '@/hooks/accounting'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import type { InvoiceType, UpdateInvoiceInput } from '@/lib/dal/accounting'

interface InvoiceEditClientProps {
  invoiceId: string
  locale: string
}

// 共用 input 樣式
const inputClassName =
  'block w-full px-4 py-3 text-sm border-2 rounded-2xl bg-white text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 hover:border-slate-300 border-slate-200'
const disabledInputClassName =
  'block w-full px-4 py-3 text-sm border-2 rounded-2xl bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
const labelClassName = 'block text-sm font-medium text-slate-700 mb-2'

/**
 * 發票編輯客戶端元件
 */
export default function InvoiceEditClient({ invoiceId, locale }: InvoiceEditClientProps) {
  const t = useTranslations()
  const router = useRouter()
  const { data: invoice, isLoading, error } = useInvoice(invoiceId)
  const updateInvoice = useUpdateInvoice()

  // 表單狀態
  const [formData, setFormData] = useState({
    number: '',
    type: 'OUTPUT' as InvoiceType,
    date: '',
    untaxedAmount: '',
    taxAmount: '',
    totalAmount: '',
    counterpartyName: '',
    counterpartyTaxId: '',
    description: '',
    dueDate: '',
  })

  // 當發票資料載入後，填充表單
  useEffect(() => {
    if (invoice) {
      setFormData({
        number: invoice.number || '',
        type: invoice.type as InvoiceType,
        date: invoice.date || '',
        untaxedAmount: invoice.untaxed_amount?.toString() || '',
        taxAmount: invoice.tax_amount?.toString() || '',
        totalAmount: invoice.total_amount?.toString() || '',
        counterpartyName: invoice.counterparty_name || '',
        counterpartyTaxId: invoice.counterparty_tax_id || '',
        description: invoice.description || '',
        dueDate: invoice.due_date || '',
      })
    }
  }, [invoice])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    )
  }

  if (error || !invoice) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-destructive">
          {t('common.error')}: {error?.message || t('common.notFound')}
        </CardContent>
      </Card>
    )
  }

  // 判斷編輯權限
  const isDraft = invoice.status === 'DRAFT'
  const isVoided = invoice.status === 'VOIDED'
  const canEdit = !isVoided

  // 非草稿狀態只能編輯這些欄位
  const isFieldEditable = (fieldName: string) => {
    if (!canEdit) return false
    if (isDraft) return true
    return ['description', 'dueDate'].includes(fieldName)
  }

  // 稅率計算（預設 5%）
  const handleUntaxedChange = (value: string) => {
    if (!isDraft) return
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

    if (!canEdit) {
      toast.error(t('accounting.invoices.editNotAllowed'))
      return
    }

    try {
      const input: UpdateInvoiceInput = {}

      if (isDraft) {
        // 草稿狀態可編輯所有欄位
        if (formData.number.trim()) input.number = formData.number.trim()
        if (formData.date) input.date = formData.date
        if (formData.untaxedAmount) input.untaxed_amount = parseFloat(formData.untaxedAmount)
        if (formData.taxAmount) input.tax_amount = parseFloat(formData.taxAmount)
        if (formData.totalAmount) input.total_amount = parseFloat(formData.totalAmount)
        if (formData.counterpartyName.trim())
          input.counterparty_name = formData.counterpartyName.trim()
        if (formData.counterpartyTaxId.trim())
          input.counterparty_tax_id = formData.counterpartyTaxId.trim()
      }

      // 所有狀態都可編輯 description 和 due_date
      input.description = formData.description.trim() || undefined
      input.due_date = formData.dueDate || undefined

      await updateInvoice.mutateAsync({ id: invoiceId, input })
      toast.success(t('common.saveSuccess'))
      router.push(`/${locale}/accounting/invoices/${invoiceId}`)
    } catch (error) {
      console.error('Error updating invoice:', error)
      const message = error instanceof Error ? error.message : t('common.saveFailed')
      toast.error(message)
    }
  }

  const isSubmitting = updateInvoice.isPending

  const getStatusBadge = () => {
    const variants: Record<string, 'outline' | 'secondary' | 'default' | 'destructive'> = {
      DRAFT: 'outline',
      VERIFIED: 'secondary',
      POSTED: 'default',
      VOIDED: 'destructive',
    }
    const statusMap: Record<string, string> = {
      DRAFT: 'draft',
      VERIFIED: 'verified',
      POSTED: 'posted',
      VOIDED: 'voided',
    }
    return (
      <Badge variant={variants[invoice.status] || 'outline'}>
        {t(`accounting.status.${statusMap[invoice.status] || invoice.status.toLowerCase()}`)}
      </Badge>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* 狀態提示 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('accounting.invoices.status')}:</span>
              {getStatusBadge()}
            </div>
          </div>

          {/* 非草稿狀態提示 */}
          {!isDraft && canEdit && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {t('accounting.invoices.partialEdit')}
            </div>
          )}

          {/* 已作廢提示 */}
          {isVoided && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {t('accounting.invoices.editNotAllowed')}
            </div>
          )}

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
                className={isFieldEditable('type') ? inputClassName : disabledInputClassName}
                disabled={!isFieldEditable('type')}
              >
                <option value="OUTPUT">{t('accounting.invoiceTypes.output')}</option>
                <option value="INPUT">{t('accounting.invoiceTypes.input')}</option>
              </select>
            </div>

            <div>
              <label htmlFor="number" className={labelClassName}>
                {t('accounting.invoices.invoiceNumber')}
              </label>
              <input
                type="text"
                id="number"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                className={isFieldEditable('number') ? inputClassName : disabledInputClassName}
                disabled={!isFieldEditable('number')}
              />
            </div>
          </div>

          {/* 日期 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className={labelClassName}>
                {t('accounting.invoices.date')}
              </label>
              <input
                type="date"
                id="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className={isFieldEditable('date') ? inputClassName : disabledInputClassName}
                disabled={!isFieldEditable('date')}
              />
            </div>

            <div>
              <label htmlFor="dueDate" className={labelClassName}>
                {t('accounting.invoices.dueDate')}
              </label>
              <input
                type="date"
                id="dueDate"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className={isFieldEditable('dueDate') ? inputClassName : disabledInputClassName}
                disabled={!isFieldEditable('dueDate')}
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
                className={
                  isFieldEditable('counterpartyName') ? inputClassName : disabledInputClassName
                }
                disabled={!isFieldEditable('counterpartyName')}
              />
            </div>

            <div>
              <label htmlFor="counterpartyTaxId" className={labelClassName}>
                {t('accounting.invoices.taxId')}
              </label>
              <input
                type="text"
                id="counterpartyTaxId"
                value={formData.counterpartyTaxId}
                onChange={(e) => setFormData({ ...formData, counterpartyTaxId: e.target.value })}
                className={
                  isFieldEditable('counterpartyTaxId') ? inputClassName : disabledInputClassName
                }
                disabled={!isFieldEditable('counterpartyTaxId')}
              />
            </div>
          </div>

          {/* 金額 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="untaxedAmount" className={labelClassName}>
                {t('accounting.invoices.untaxedAmount')}
              </label>
              <input
                type="number"
                id="untaxedAmount"
                min="0"
                step="1"
                value={formData.untaxedAmount}
                onChange={(e) => handleUntaxedChange(e.target.value)}
                className={
                  isFieldEditable('untaxedAmount') ? inputClassName : disabledInputClassName
                }
                disabled={!isFieldEditable('untaxedAmount')}
              />
            </div>

            <div>
              <label htmlFor="taxAmount" className={labelClassName}>
                {t('accounting.invoices.taxAmount')}
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
                className={isFieldEditable('taxAmount') ? inputClassName : disabledInputClassName}
                disabled={!isFieldEditable('taxAmount')}
              />
            </div>

            <div>
              <label htmlFor="totalAmount" className={labelClassName}>
                {t('accounting.invoices.totalAmount')}
              </label>
              <input
                type="number"
                id="totalAmount"
                min="0"
                step="1"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                className={`${isFieldEditable('totalAmount') ? inputClassName : disabledInputClassName} font-medium`}
                disabled={!isFieldEditable('totalAmount')}
              />
            </div>
          </div>

          {/* 摘要 */}
          <div>
            <label htmlFor="description" className={labelClassName}>
              {t('accounting.invoices.description')}
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className={isFieldEditable('description') ? inputClassName : disabledInputClassName}
              disabled={!isFieldEditable('description')}
            />
          </div>

          {/* 按鈕 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/${locale}/accounting/invoices/${invoiceId}`)}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || !canEdit}>
              {isSubmitting ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
