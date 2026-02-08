'use client'

import { useState } from 'react'
import { useCustomers } from '@/hooks/useCustomers'
import { useUpdatePaymentSchedule, type CurrentMonthReceivable } from '@/hooks/usePayments'
import { toast } from 'sonner'

// 狀態標籤對應
const STATUS_LABELS: Record<string, string> = {
  pending: '待收款',
  paid: '已收款',
  overdue: '已逾期',
}

interface EditPaymentScheduleModalProps {
  schedule: CurrentMonthReceivable
  onClose: () => void
}

export default function EditPaymentScheduleModal({
  schedule,
  onClose,
}: EditPaymentScheduleModalProps) {
  // 固定使用繁體中文
  const locale = 'zh'
  const { data: customers, isLoading: loadingCustomers } = useCustomers()
  const updateSchedule = useUpdatePaymentSchedule()

  const [formData, setFormData] = useState({
    customer_id: schedule.customer_id,
    due_date: schedule.due_date.split('T')[0],
    amount: schedule.amount.toString(),
    currency: schedule.currency,
    description: schedule.description || '',
    notes: '',
  })

  // 用 render 階段同步模式，同步 schedule prop 到 formData state
  const [prevSchedule, setPrevSchedule] = useState(schedule)
  if (schedule !== prevSchedule) {
    setPrevSchedule(schedule)
    setFormData({
      customer_id: schedule.customer_id,
      due_date: schedule.due_date.split('T')[0],
      amount: schedule.amount.toString(),
      currency: schedule.currency,
      description: schedule.description || '',
      notes: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customer_id) {
      toast.error('請選擇客戶')
      return
    }
    if (!formData.due_date) {
      toast.error('請選擇到期日')
      return
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('請輸入有效金額')
      return
    }

    try {
      await updateSchedule.mutateAsync({
        scheduleId: schedule.id,
        input: {
          customer_id: formData.customer_id,
          due_date: formData.due_date,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          description: formData.description || undefined,
          notes: formData.notes || undefined,
        },
      })
      toast.success('收款排程已更新')
      onClose()
    } catch (error) {
      toast.error((error as Error).message || '更新收款排程失敗')
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              編輯收款排程
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
                客戶 *
              </label>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loadingCustomers}
              >
                <option value="">請選擇客戶</option>
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
                到期日 *
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
                  金額 *
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
                  幣別
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
                說明
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="輸入收款說明"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                備註
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="輸入備註"
              />
            </div>

            <div className="text-sm text-gray-500">
              <p>狀態: <span className={`px-2 py-1 text-xs font-medium rounded ${
                schedule.status === 'paid'
                  ? 'bg-green-100 text-green-800'
                  : schedule.status === 'overdue'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>{STATUS_LABELS[schedule.status] || schedule.status}</span></p>
              {schedule.quotation_number && (
                <p className="mt-1">報價單號: {schedule.quotation_number}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={updateSchedule.isPending}
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={updateSchedule.isPending}
              >
                {updateSchedule.isPending ? '儲存中...' : '儲存'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
