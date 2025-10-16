'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import EmptyState from '@/components/ui/EmptyState'

interface Quotation {
  id: string
  quotation_number: string
  customer_id: string
  customers: {
    id: string
    name: { zh: string; en: string }
    email: string
  }
  issue_date: string
  valid_until: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  currency: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  created_at: string
}

interface QuotationListProps {
  quotations: Quotation[]
  locale: string
}

export default function QuotationList({ quotations, locale }: QuotationListProps) {
  const t = useTranslations()
  const router = useRouter()
  const supabase = createClient()
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; quotation: Quotation | null }>({
    isOpen: false,
    quotation: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // 批次操作狀態
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBatchOperation, setIsBatchOperation] = useState(false)
  const [batchDeleteModal, setBatchDeleteModal] = useState(false)
  const [batchStatusModal, setBatchStatusModal] = useState(false)
  const [newBatchStatus, setNewBatchStatus] = useState<string>('sent')
  const [isProcessing, setIsProcessing] = useState(false)

  const filteredQuotations = quotations.filter((quotation) => {
    if (statusFilter === 'all') return true
    return quotation.status === statusFilter
  })

  // 批次操作處理函數
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredQuotations.map(q => q.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  const handleBatchDelete = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/quotations/batch/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      })

      if (!response.ok) throw new Error('Failed to delete quotations')

      setBatchDeleteModal(false)
      setSelectedIds(new Set())
      setIsBatchOperation(false)
      router.refresh()
    } catch (error) {
      console.error('Batch delete error:', error)
      alert('批次刪除失敗')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBatchStatusUpdate = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/quotations/batch/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          status: newBatchStatus
        })
      })

      if (!response.ok) throw new Error('Failed to update status')

      setBatchStatusModal(false)
      setSelectedIds(new Set())
      setIsBatchOperation(false)
      router.refresh()
    } catch (error) {
      console.error('Batch status update error:', error)
      alert('批次更新狀態失敗')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBatchExport = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/quotations/batch/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          locale
        })
      })

      if (!response.ok) throw new Error('Failed to export PDFs')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quotations_${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setSelectedIds(new Set())
      setIsBatchOperation(false)
    } catch (error) {
      console.error('Batch export error:', error)
      alert('批次匯出失敗')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.quotation) return

    setIsDeleting(true)
    try {
      // First delete quotation items
      const { error: itemsError } = await supabase
        .from('quotation_items')
        .delete()
        .eq('quotation_id', deleteModal.quotation.id)

      if (itemsError) throw itemsError

      // Then delete the quotation
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', deleteModal.quotation.id)

      if (error) throw error

      setDeleteModal({ isOpen: false, quotation: null })
      router.refresh()
    } catch (error) {
      console.error('Error deleting quotation:', error)
      alert('Failed to delete quotation')
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status as keyof typeof statusColors]}`}>
        {t(`status.${status}`)}
      </span>
    )
  }

  if (quotations.length === 0) {
    return (
      <EmptyState
        icon="📄"
        title={t('quotation.emptyState.title')}
        description={t('quotation.emptyState.description')}
        action={{
          label: t('quotation.createNew'),
          onClick: () => router.push(`/${locale}/quotations/new`),
        }}
      />
    )
  }

  return (
    <>
      <div className="p-6">
        <div className="mb-4 flex justify-between items-center">
          <div className="flex gap-2 items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">{t('quotation.allStatus')}</option>
              <option value="draft">{t('status.draft')}</option>
              <option value="sent">{t('status.sent')}</option>
              <option value="accepted">{t('status.accepted')}</option>
              <option value="rejected">{t('status.rejected')}</option>
            </select>

            {quotations.length > 0 && (
              <button
                onClick={() => {
                  setIsBatchOperation(!isBatchOperation)
                  setSelectedIds(new Set())
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isBatchOperation
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {isBatchOperation ? t('batch.cancel') : t('batch.selectMultiple')}
              </button>
            )}
          </div>

          {isBatchOperation && selectedIds.size > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => setBatchStatusModal(true)}
                className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 font-medium text-sm"
              >
                {t('batch.updateStatus')} ({selectedIds.size})
              </button>
              <button
                onClick={handleBatchExport}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium text-sm disabled:opacity-50"
              >
                {t('batch.exportPDF')} ({selectedIds.size})
              </button>
              <button
                onClick={() => setBatchDeleteModal(true)}
                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-sm"
              >
                {t('batch.delete')} ({selectedIds.size})
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {isBatchOperation && (
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredQuotations.length && filteredQuotations.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('quotation.quotationNumber')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('quotation.customer')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('quotation.issueDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('quotation.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('quotation.total')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredQuotations.map((quotation) => (
                <tr key={quotation.id} className="hover:bg-gray-50">
                  {isBatchOperation && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(quotation.id)}
                        onChange={(e) => handleSelectOne(quotation.id, e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {quotation.quotation_number}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {quotation.customers?.name[locale as 'zh' | 'en']}
                    </div>
                    <div className="text-xs text-gray-500">{quotation.customers?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(quotation.issue_date).toLocaleDateString(locale === 'zh' ? 'zh-TW' : 'en-US')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(quotation.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {quotation.currency} {quotation.total_amount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => router.push(`/${locale}/quotations/${quotation.id}`)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      {t('common.view')}
                    </button>
                    <button
                      onClick={() => setDeleteModal({ isOpen: true, quotation })}
                      className="text-red-600 hover:text-red-900"
                    >
                      {t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredQuotations.length === 0 && statusFilter !== 'all' && (
          <div className="text-center py-8 text-gray-500">
            {t('common.noResults')}
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, quotation: null })}
        onConfirm={handleDelete}
        title={t('quotation.deleteConfirm.title')}
        description={t('quotation.deleteConfirm.description')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        isLoading={isDeleting}
      />

      {/* 批次刪除確認彈窗 */}
      <DeleteConfirmModal
        isOpen={batchDeleteModal}
        onClose={() => setBatchDeleteModal(false)}
        onConfirm={handleBatchDelete}
        title={t('batch.deleteConfirm.title')}
        description={t('batch.deleteConfirm.description', { count: selectedIds.size })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        isLoading={isProcessing}
      />

      {/* 批次更新狀態彈窗 */}
      {batchStatusModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('batch.updateStatus')}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('batch.updateStatusDescription', { count: selectedIds.size })}
            </p>
            <select
              value={newBatchStatus}
              onChange={(e) => setNewBatchStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            >
              <option value="draft">{t('status.draft')}</option>
              <option value="sent">{t('status.sent')}</option>
              <option value="accepted">{t('status.accepted')}</option>
              <option value="rejected">{t('status.rejected')}</option>
            </select>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setBatchStatusModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleBatchStatusUpdate}
                disabled={isProcessing}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isProcessing ? t('common.saving') : t('batch.update')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
