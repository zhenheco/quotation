'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import EmptyState from '@/components/ui/EmptyState'
import {
  useQuotations,
  useDeleteQuotation,
  useUpdateQuotation,
  useBatchDeleteQuotations,
  useBatchUpdateStatus,
  useBatchExportPDFs,
  useSendQuotation,
  useBatchSendQuotations,
  type Quotation,
  type QuotationStatus,
  type QuotationWithCustomer,
} from '@/hooks/useQuotations'
import SendQuotationModal from '@/components/quotations/SendQuotationModal'
import { toast } from 'sonner'

interface QuotationListProps {
  locale: string
}

export default function QuotationList({ locale }: QuotationListProps) {
  const t = useTranslations()
  const router = useRouter()

  // Hooks
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { data: quotations = [], isLoading, error } = useQuotations(
    statusFilter !== 'all' ? { status: statusFilter as QuotationStatus } : undefined
  )
  const deleteQuotation = useDeleteQuotation()
  const batchDelete = useBatchDeleteQuotations()
  const batchUpdateStatus = useBatchUpdateStatus()
  const batchExport = useBatchExportPDFs()
  const sendQuotation = useSendQuotation()
  const batchSend = useBatchSendQuotations()

  // 狀態
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; quotation: Quotation | null }>({
    isOpen: false,
    quotation: null,
  })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBatchOperation, setIsBatchOperation] = useState(false)
  const [batchDeleteModal, setBatchDeleteModal] = useState(false)
  const [batchStatusModal, setBatchStatusModal] = useState(false)
  const [newBatchStatus, setNewBatchStatus] = useState<QuotationStatus>('sent')
  const [sendModal, setSendModal] = useState<{ isOpen: boolean; quotation: QuotationWithCustomer | null; isBatch: boolean }>({
    isOpen: false,
    quotation: null,
    isBatch: false,
  })

  // 批次操作處理函數
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(quotations.map(q => q.id)))
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
    try {
      const result = await batchDelete.mutateAsync({ ids: Array.from(selectedIds) })
      toast.success(`已刪除 ${result.deleted} 個報價單`)
      setBatchDeleteModal(false)
      setSelectedIds(new Set())
      setIsBatchOperation(false)
    } catch (error) {
      toast.error('批次刪除失敗')
      console.error('Batch delete error:', error)
    }
  }

  const handleBatchStatusUpdate = async () => {
    try {
      const result = await batchUpdateStatus.mutateAsync({
        ids: Array.from(selectedIds),
        status: newBatchStatus,
      })
      toast.success(`已更新 ${result.updated} 個報價單狀態`)
      setBatchStatusModal(false)
      setSelectedIds(new Set())
      setIsBatchOperation(false)
    } catch (error) {
      toast.error('批次更新狀態失敗')
      console.error('Batch status update error:', error)
    }
  }

  const handleStatusChange = async (quotationId: string, newStatus: QuotationStatus) => {
    try {
      const response = await fetch(`/api/quotations/${quotationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      toast.success(`狀態已更新為 ${t(`status.${newStatus}`)}`)
      window.location.reload()
    } catch (error) {
      toast.error('更新狀態失敗')
      console.error('Error updating status:', error)
    }
  }

  const handleBatchExport = async () => {
    try {
      await batchExport.mutateAsync({
        ids: Array.from(selectedIds),
        locale: locale as 'zh' | 'en',
      })
      toast.success('批次匯出成功')
      setSelectedIds(new Set())
      setIsBatchOperation(false)
    } catch (error) {
      toast.error('批次匯出失敗')
      console.error('Batch export error:', error)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.quotation) return

    try {
      await deleteQuotation.mutateAsync(deleteModal.quotation.id)
      toast.success('報價單已刪除')
      setDeleteModal({ isOpen: false, quotation: null })
    } catch (error) {
      toast.error('刪除失敗')
      console.error('Error deleting quotation:', error)
    }
  }

  const handleSend = async (data: { subject: string; content: string }) => {
    try {
      if (sendModal.isBatch) {
        const result = await batchSend.mutateAsync({
          ids: Array.from(selectedIds),
          subject: data.subject,
          content: data.content,
          locale: locale as 'zh' | 'en',
        })
        if (result.data.failed > 0) {
          toast.warning(`已成功寄送 ${result.data.sent} 個報價單，${result.data.failed} 個失敗`)
        } else {
          toast.success(`已成功寄送 ${result.data.sent} 個報價單`)
        }
        setSelectedIds(new Set())
        setIsBatchOperation(false)
      } else if (sendModal.quotation) {
        await sendQuotation.mutateAsync({
          id: sendModal.quotation.id,
          subject: data.subject,
          content: data.content,
          locale: locale as 'zh' | 'en',
        })
        toast.success(`報價單已成功寄送至 ${sendModal.quotation.customer_email}`)
      }
      setSendModal({ isOpen: false, quotation: null, isBatch: false })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '寄送失敗'
      toast.error(errorMessage)
      console.error('Error sending quotation:', error)
    }
  }

  // 判斷報價單是否已過期
  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date()
  }

  const getStatusBadge = (quotation: Quotation) => {
    let status = quotation.status

    // 如果狀態是 sent 或 draft 且已經過期，顯示為 expired
    if ((status === 'sent' || status === 'draft') && isExpired(quotation.valid_until)) {
      status = 'expired' as QuotationStatus
    }

    const statusColors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-orange-100 text-orange-800',
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status as keyof typeof statusColors]}`}>
        {t(`status.${status}`)}
      </span>
    )
  }

  // 載入狀態
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">載入報價單失敗：{error.message}</p>
        </div>
      </div>
    )
  }

  // 空狀態
  if (quotations.length === 0 && statusFilter === 'all') {
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
              <option value="signed">{t('status.signed')}</option>
              <option value="expired">{t('status.expired')}</option>
            </select>

            {quotations.length > 0 && (
              <button
                onClick={() => {
                  setIsBatchOperation(!isBatchOperation)
                  setSelectedIds(new Set())
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
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
                className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 font-medium text-sm cursor-pointer"
              >
                {t('batch.updateStatus')} ({selectedIds.size})
              </button>
              <button
                onClick={() => setSendModal({ isOpen: true, quotation: null, isBatch: true })}
                className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 font-medium text-sm cursor-pointer"
              >
                {t('batch.send')} ({selectedIds.size})
              </button>
              <button
                onClick={handleBatchExport}
                disabled={batchExport.isPending}
                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium text-sm disabled:opacity-50 cursor-pointer"
              >
                {batchExport.isPending ? '匯出中...' : `${t('batch.exportPDF')} (${selectedIds.size})`}
              </button>
              <button
                onClick={() => setBatchDeleteModal(true)}
                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-sm cursor-pointer"
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
                      checked={selectedIds.size === quotations.length && quotations.length > 0}
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
                  {t('quotation.validUntil')}
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
              {quotations.map((quotation) => (
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
                      {quotation.customer_name
                        ? (locale === 'zh' ? quotation.customer_name.zh : quotation.customer_name.en)
                        : quotation.customer_id}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {locale === 'zh'
                        ? new Date(quotation.issue_date).toLocaleDateString('zh-TW', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : new Date(quotation.issue_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {locale === 'zh'
                        ? new Date(quotation.valid_until).toLocaleDateString('zh-TW', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : new Date(quotation.valid_until).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={quotation.status}
                      onChange={(e) => handleStatusChange(quotation.id, e.target.value as QuotationStatus)}
                      className="px-3 py-1 text-sm font-medium rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
                    >
                      <option value="draft">{t('status.draft')}</option>
                      <option value="sent">{t('status.sent')}</option>
                      <option value="signed">{t('status.signed')}</option>
                      <option value="expired">{t('status.expired')}</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {quotation.currency} {quotation.total?.toLocaleString() || '0'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => router.push(`/${locale}/quotations/${quotation.id}/edit`)}
                      className="text-blue-600 hover:text-blue-900 mr-4 cursor-pointer"
                    >
                      {t('common.edit')}
                    </button>
                    {quotation.customer_email ? (
                      <button
                        onClick={() => setSendModal({ isOpen: true, quotation, isBatch: false })}
                        className="text-green-700 hover:text-green-900 mr-4 cursor-pointer"
                        title={t('quotation.send')}
                      >
                        {t('quotation.send')}
                      </button>
                    ) : (
                      <button
                        disabled
                        className="text-gray-400 mr-4 cursor-not-allowed"
                        title={t('quotation.noCustomerEmail')}
                      >
                        {t('quotation.send')}
                      </button>
                    )}
                    <button
                      onClick={() => router.push(`/${locale}/quotations/${quotation.id}`)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4 cursor-pointer"
                    >
                      {t('common.view')}
                    </button>
                    <button
                      onClick={() => setDeleteModal({ isOpen: true, quotation })}
                      className="text-red-600 hover:text-red-900 cursor-pointer"
                    >
                      {t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {quotations.length === 0 && statusFilter !== 'all' && (
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
        isLoading={deleteQuotation.isPending}
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
        isLoading={batchDelete.isPending}
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
              onChange={(e) => setNewBatchStatus(e.target.value as QuotationStatus)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            >
              <option value="draft">{t('status.draft')}</option>
              <option value="sent">{t('status.sent')}</option>
              <option value="signed">{t('status.signed')}</option>
              <option value="expired">{t('status.expired')}</option>
            </select>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setBatchStatusModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleBatchStatusUpdate}
                disabled={batchUpdateStatus.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
              >
                {batchUpdateStatus.isPending ? t('common.saving') : t('batch.update')}
              </button>
            </div>
          </div>
        </div>
      )}

      <SendQuotationModal
        isOpen={sendModal.isOpen}
        onClose={() => setSendModal({ isOpen: false, quotation: null, isBatch: false })}
        onConfirm={handleSend}
        quotation={sendModal.quotation}
        locale={locale}
        isLoading={sendModal.isBatch ? batchSend.isPending : sendQuotation.isPending}
        isBatch={sendModal.isBatch}
        selectedCount={selectedIds.size}
      />
    </>
  )
}
