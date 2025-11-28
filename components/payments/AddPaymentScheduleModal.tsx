'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useCustomers } from '@/hooks/useCustomers'
import { toast } from 'sonner'
import { apiPost } from '@/lib/api-client'

interface AddPaymentScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  locale: string
}

export default function AddPaymentScheduleModal({
  isOpen,
  onClose,
  onSuccess,
  locale
}: AddPaymentScheduleModalProps) {
  const t = useTranslations()
  const { data: customers, isLoading: loadingCustomers } = useCustomers()

  const [formData, setFormData] = useState({
    customer_id: '',
    due_date: '',
    amount: '',
    currency: 'TWD',
    description: '',
    notes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        customer_id: '',
        due_date: '',
        amount: '',
        currency: 'TWD',
        description: '',
        notes: '',
      })
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customer_id) {
      toast.error(t('payments.addSchedule.errors.customerRequired'))
      return
    }
    if (!formData.due_date) {
      toast.error(t('payments.addSchedule.errors.dueDateRequired'))
      return
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error(t('payments.addSchedule.errors.amountRequired'))
      return
    }

    setIsSubmitting(true)

    try {
      await apiPost('/api/payments/schedules', {
        customer_id: formData.customer_id,
        due_date: formData.due_date,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        description: formData.description || undefined,
        notes: formData.notes || undefined,
      })

      toast.success(t('payments.addSchedule.success'))
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('payments.addSchedule.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {t('payments.addSchedule.title')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('payments.addSchedule.customer')} *
              </label>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loadingCustomers}
              >
                <option value="">{t('payments.addSchedule.selectCustomer')}</option>
                {customers?.map((customer) => {
                  const displayName = typeof customer.name === 'object'
                    ? (locale === 'zh' ? customer.name.zh : customer.name.en)
                    : customer.name
                  return (
                    <option key={customer.id} value={customer.id}>
                      {displayName}
                    </option>
                  )
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('payments.addSchedule.dueDate')} *
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('payments.addSchedule.amount')} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('payments.addSchedule.currency')}
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="TWD">TWD</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="JPY">JPY</option>
                  <option value="CNY">CNY</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('payments.addSchedule.description')}
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('payments.addSchedule.descriptionPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('payments.addSchedule.notes')}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('payments.addSchedule.notesPlaceholder')}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
