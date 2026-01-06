'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DeleteConfirmModal, { type RelatedRecordsInfo } from '@/components/ui/DeleteConfirmModal'
import EmptyState from '@/components/ui/EmptyState'
import {
  useQuotations,
  useDeleteQuotation,
  useBatchDeleteQuotations,
  useBatchUpdateStatus,
  useSendQuotation,
  useBatchSendQuotations,
  type Quotation,
  type QuotationStatus,
  type QuotationWithCustomer,
} from '@/hooks/useQuotations'
import SendQuotationModal from '@/components/quotations/SendQuotationModal'
import { toast } from 'sonner'
import { apiPatch } from '@/lib/api-client'

export default function QuotationList() {
  const router = useRouter()

  // Hooks
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { data: quotations = [], isLoading, error } = useQuotations(
    statusFilter !== 'all' ? { status: statusFilter as QuotationStatus } : undefined
  )
  const deleteQuotation = useDeleteQuotation()
  const batchDelete = useBatchDeleteQuotations()
  const batchUpdateStatus = useBatchUpdateStatus()
  const sendQuotation = useSendQuotation()
  const batchSend = useBatchSendQuotations()

  // 狀態
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    quotation: Quotation | null
    relatedRecords?: RelatedRecordsInfo
    isCheckingRelated?: boolean
  }>({
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
      toast.success(`已刪除 ${result.deleted} 筆報價單`)
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
      toast.success(`已更新 ${result.updated} 筆報價單狀態`)
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
      await apiPatch(`/api/quotations/${quotationId}`, { status: newStatus })
      toast.success('狀態已更新')
      window.location.reload()
    } catch (error) {
      toast.error('更新狀態失敗')
      console.error('Error updating status:', error)
    }
  }

  // 點擊刪除時，先檢查是否有關聯紀錄
  const handleDeleteClick = async (quotation: Quotation) => {
    setDeleteModal({
      isOpen: true,
      quotation,
      isCheckingRelated: true,
    })

    try {
      const response = await fetch(`/api/quotations/${quotation.id}/related-payments`)
      if (response.ok) {
        const data = await response.json()
        setDeleteModal(prev => ({
          ...prev,
          relatedRecords: data,
          isCheckingRelated: false,
        }))
      } else {
        setDeleteModal(prev => ({
          ...prev,
          isCheckingRelated: false,
        }))
      }
    } catch (error) {
      console.error('Error checking related records:', error)
      setDeleteModal(prev => ({
        ...prev,
        isCheckingRelated: false,
      }))
    }
  }

  const handleDelete = async (forceDelete?: boolean) => {
    if (!deleteModal.quotation) return

    try {
      await deleteQuotation.mutateAsync({
        id: deleteModal.quotation.id,
        forceDelete: forceDelete ?? false,
      })
      toast.success('報價單已刪除')
      setDeleteModal({ isOpen: false, quotation: null })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '刪除報價單失敗'
      toast.error(errorMessage)
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
          locale: 'zh',
        })
        if (result.data.failed > 0) {
          toast.warning(`已發送 ${result.data.sent} 筆，失敗 ${result.data.failed} 筆`)
        } else {
          toast.success(`已發送 ${result.data.sent} 筆報價單`)
        }
        setSelectedIds(new Set())
        setIsBatchOperation(false)
      } else if (sendModal.quotation) {
        await sendQuotation.mutateAsync({
          id: sendModal.quotation.id,
          subject: data.subject,
          content: data.content,
          locale: 'zh',
        })
        toast.success(`報價單已發送至 ${sendModal.quotation.customer_email}`)
      }
      setSendModal({ isOpen: false, quotation: null, isBatch: false })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '發送報價單失敗'
      toast.error(errorMessage)
      console.error('Error sending quotation:', error)
    }
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
          <p className="text-red-800">載入報價單失敗: {error.message}</p>
        </div>
      </div>
    )
  }

  // 空狀態
  if (quotations.length === 0 && statusFilter === 'all') {
    return (
      <EmptyState
        icon="📄"
        title="尚無報價單"
        description="建立您的第一份報價單"
        action={{
          label: '建立報價單',
          onClick: () => router.push(`/quotations/new`),
        }}
      />
    )
  }

  return (
    <>
      <div className="p-4">
        <div className="mb-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
            >
              <option value="all">全部狀態</option>
              <option value="draft">草稿</option>
              <option value="sent">已發送</option>
              <option value="accepted">已接受</option>
              <option value="expired">已過期</option>
            </select>

            {quotations.length > 0 && (
              <button
                onClick={() => {
                  setIsBatchOperation(!isBatchOperation)
                  setSelectedIds(new Set())
                }}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer text-sm sm:text-base ${
                  isBatchOperation
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {isBatchOperation ? '取消選取' : '批次選取'}
              </button>
            )}
          </div>

          {isBatchOperation && selectedIds.size > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setBatchStatusModal(true)}
                className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 font-medium text-xs sm:text-sm cursor-pointer"
              >
                批次更新狀態 ({selectedIds.size})
              </button>
              <button
                onClick={() => setSendModal({ isOpen: true, quotation: null, isBatch: true })}
                className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 font-medium text-xs sm:text-sm cursor-pointer"
              >
                批次發送 ({selectedIds.size})
              </button>
              <button
                onClick={() => setBatchDeleteModal(true)}
                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-xs sm:text-sm cursor-pointer"
              >
                批次刪除 ({selectedIds.size})
              </button>
            </div>
          )}
        </div>

        {/* 桌面版表格 */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {isBatchOperation && (
                  <th className="px-4 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === quotations.length && quotations.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </th>
                )}
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  報價單號
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  客戶
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  開立日期
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  有效期限
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  狀態
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  總金額
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quotations.map((quotation) => (
                <tr key={quotation.id} className="hover:bg-gray-50">
                  {isBatchOperation && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(quotation.id)}
                        onChange={(e) => handleSelectOne(quotation.id, e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {quotation.quotation_number}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {quotation.customer_name
                        ? quotation.customer_name.zh || quotation.customer_name.en
                        : quotation.customer_id}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(quotation.issue_date).toLocaleDateString('zh-TW', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(quotation.valid_until).toLocaleDateString('zh-TW', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <select
                      value={quotation.status}
                      onChange={(e) => handleStatusChange(quotation.id, e.target.value as QuotationStatus)}
                      className="px-3 py-1 text-sm font-medium rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
                    >
                      <option value="draft">草稿</option>
                      <option value="sent">已發送</option>
                      <option value="accepted">已接受</option>
                      <option value="expired">已過期</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {quotation.currency} {quotation.total_amount?.toLocaleString() || '0'}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => router.push(`/quotations/${quotation.id}/edit`)}
                      className="text-blue-600 hover:text-blue-900 mr-4 cursor-pointer"
                    >
                      編輯
                    </button>
                    {quotation.customer_email ? (
                      <button
                        onClick={() => setSendModal({ isOpen: true, quotation, isBatch: false })}
                        className="text-green-700 hover:text-green-900 mr-4 cursor-pointer"
                        title="發送報價單"
                      >
                        發送
                      </button>
                    ) : (
                      <button
                        disabled
                        className="text-gray-400 mr-4 cursor-not-allowed"
                        title="客戶無電子郵件"
                      >
                        發送
                      </button>
                    )}
                    <button
                      onClick={() => router.push(`/quotations/${quotation.id}`)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4 cursor-pointer"
                    >
                      檢視
                    </button>
                    <button
                      onClick={() => handleDeleteClick(quotation)}
                      className="text-red-600 hover:text-red-900 cursor-pointer"
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 手機版卡片 */}
        <div className="md:hidden divide-y divide-gray-200">
          {quotations.map((quotation) => (
            <div key={quotation.id} className="p-3 bg-white">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start space-x-3">
                  {isBatchOperation && (
                    <div className="mt-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(quotation.id)}
                        onChange={(e) => handleSelectOne(quotation.id, e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {quotation.quotation_number}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {quotation.customer_name
                        ? quotation.customer_name.zh || quotation.customer_name.en
                        : quotation.customer_id}
                    </p>
                  </div>
                </div>
                <select
                  value={quotation.status}
                  onChange={(e) => handleStatusChange(quotation.id, e.target.value as QuotationStatus)}
                  className="px-2 py-1 text-xs font-medium rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
                >
                  <option value="draft">草稿</option>
                  <option value="sent">已發送</option>
                  <option value="accepted">已接受</option>
                  <option value="expired">已過期</option>
                </select>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">總金額</span>
                  <span className="font-medium text-gray-900">
                    {quotation.currency} {quotation.total_amount?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">開立日期</span>
                  <span className="text-gray-900">
                    {new Date(quotation.issue_date).toLocaleDateString('zh-TW', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">有效期限</span>
                  <span className="text-gray-900">
                    {new Date(quotation.valid_until).toLocaleDateString('zh-TW', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t">
                <button
                  onClick={() => router.push(`/quotations/${quotation.id}/edit`)}
                  className="text-blue-600 hover:text-blue-900 text-sm"
                >
                  編輯
                </button>
                {quotation.customer_email ? (
                  <button
                    onClick={() => setSendModal({ isOpen: true, quotation, isBatch: false })}
                    className="text-green-700 hover:text-green-900 text-sm"
                  >
                    發送
                  </button>
                ) : (
                  <button
                    disabled
                    className="text-gray-400 text-sm cursor-not-allowed"
                  >
                    發送
                  </button>
                )}
                <button
                  onClick={() => router.push(`/quotations/${quotation.id}`)}
                  className="text-indigo-600 hover:text-indigo-900 text-sm"
                >
                  檢視
                </button>
                <button
                  onClick={() => handleDeleteClick(quotation)}
                  className="text-red-600 hover:text-red-900 text-sm"
                >
                  刪除
                </button>
              </div>
            </div>
          ))}
        </div>

        {quotations.length === 0 && statusFilter !== 'all' && (
          <div className="text-center py-8 text-gray-500">
            找不到符合的結果
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, quotation: null })}
        onConfirm={handleDelete}
        title="確認刪除"
        description={
          deleteModal.isCheckingRelated
            ? '正在檢查關聯紀錄...'
            : '確定要刪除這份報價單嗎？此操作無法復原。'
        }
        confirmText="刪除"
        cancelText="取消"
        isLoading={deleteQuotation.isPending || deleteModal.isCheckingRelated}
        relatedRecords={deleteModal.relatedRecords}
        forceDeleteLabel="連同刪除所有關聯的付款紀錄"
      />

      {/* 批次刪除確認彈窗 */}
      <DeleteConfirmModal
        isOpen={batchDeleteModal}
        onClose={() => setBatchDeleteModal(false)}
        onConfirm={handleBatchDelete}
        title="確認批次刪除"
        description={`確定要刪除選取的 ${selectedIds.size} 筆報價單嗎？此操作無法復原。`}
        confirmText="刪除"
        cancelText="取消"
        isLoading={batchDelete.isPending}
      />

      {/* 批次更新狀態彈窗 */}
      {batchStatusModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-20 px-4">
          <div className="relative p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              批次更新狀態
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              將選取的 {selectedIds.size} 筆報價單更新為以下狀態：
            </p>
            <select
              value={newBatchStatus}
              onChange={(e) => setNewBatchStatus(e.target.value as QuotationStatus)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            >
              <option value="draft">草稿</option>
              <option value="sent">已發送</option>
              <option value="accepted">已接受</option>
              <option value="rejected">已拒絕</option>
              <option value="approved">已核准</option>
            </select>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setBatchStatusModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleBatchStatusUpdate}
                disabled={batchUpdateStatus.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
              >
                {batchUpdateStatus.isPending ? '更新中...' : '更新'}
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
        isLoading={sendModal.isBatch ? batchSend.isPending : sendQuotation.isPending}
        isBatch={sendModal.isBatch}
        selectedCount={selectedIds.size}
      />
    </>
  )
}
