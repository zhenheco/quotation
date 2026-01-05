'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import EmptyState from '@/components/ui/EmptyState'
import { useSearchSuppliers, useDeleteSupplier } from '@/hooks/useSuppliers'

type ViewMode = 'list' | 'card'

export default function SupplierList() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; supplierId: string | null }>({
    isOpen: false,
    supplierId: null,
  })

  // 使用 hooks 取得資料
  const { data: suppliers, isLoading, error } = useSearchSuppliers(searchTerm)
  const deleteSupplier = useDeleteSupplier()

  // 刪除處理
  const handleDelete = async () => {
    if (!deleteModal.supplierId) return

    try {
      await deleteSupplier.mutateAsync(deleteModal.supplierId)
      toast.success('供應商已刪除')
      setDeleteModal({ isOpen: false, supplierId: null })
    } catch (error) {
      console.error('Error deleting supplier:', error)
      toast.error(error instanceof Error ? error.message : '刪除供應商失敗')
    }
  }

  // 載入狀態
  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error instanceof Error ? error.message : '載入供應商失敗'}
        </div>
      </div>
    )
  }

  // 空狀態
  if (!suppliers || suppliers.length === 0) {
    return (
      <EmptyState
        icon="🏭"
        title="尚無供應商資料"
        description="新增您的第一個供應商以開始管理進貨"
        action={{
          label: '新增供應商',
          onClick: () => router.push('/suppliers/new'),
        }}
      />
    )
  }

  return (
    <>
      <div className="p-4">
        <div className="mb-3 space-y-2">
          <input
            type="text"
            placeholder="搜尋..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* View mode toggle buttons - 只在桌面版顯示 */}
          <div className="hidden md:flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="列表檢視"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'card'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="卡片檢視"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* List View - 只在桌面版且選擇 list 模式時顯示 */}
        {viewMode === 'list' && (
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    供應商名稱
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    供應商代碼
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    統一編號
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    電話
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    電子郵件
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    付款條件
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suppliers.map((supplier) => {
                  const name = supplier.name as { zh: string; en: string }

                  return (
                    <tr key={supplier.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {name.zh || name.en}
                        </div>
                        {supplier.supplier_number && (
                          <div className="text-xs text-gray-500">{supplier.supplier_number}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{supplier.code || '-'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{supplier.tax_id || '-'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{supplier.phone || '-'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{supplier.email || '-'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {supplier.payment_terms || (supplier.payment_days ? `${supplier.payment_days} 天` : '-')}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => router.push(`/suppliers/${supplier.id}`)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4 cursor-pointer"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, supplierId: supplier.id })}
                          className="text-red-600 hover:text-red-900 cursor-pointer"
                          disabled={deleteSupplier.isPending}
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Card View - 手機版始終顯示，或桌面版選擇 card 模式時顯示 */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${
          viewMode === 'list' ? 'md:hidden' : ''
        }`}>
            {suppliers.map((supplier) => {
              const name = supplier.name as { zh: string; en: string }
              const address = supplier.address as { zh: string; en: string } | null

              return (
                <div
                  key={supplier.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="mb-3">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {name.zh || name.en}
                    </h3>
                    {supplier.code && (
                      <p className="text-xs text-gray-500 mb-1">代碼: {supplier.code}</p>
                    )}
                    {supplier.supplier_number && (
                      <p className="text-xs text-gray-400 mb-2">{supplier.supplier_number}</p>
                    )}
                    <div className="space-y-1.5 text-sm text-gray-600">
                      {supplier.email && (
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="break-all">{supplier.email}</span>
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{supplier.phone}</span>
                        </div>
                      )}
                      {supplier.tax_id && (
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>{supplier.tax_id}</span>
                        </div>
                      )}
                      {(address?.zh || address?.en) && (
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="line-clamp-2">{address.zh || address.en}</span>
                        </div>
                      )}
                      {(supplier.payment_terms || supplier.payment_days) && (
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{supplier.payment_terms || `${supplier.payment_days} 天`}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => router.push(`/suppliers/${supplier.id}`)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => setDeleteModal({ isOpen: true, supplierId: supplier.id })}
                      disabled={deleteSupplier.isPending}
                      className="flex-1 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              )
            })}
        </div>

        {suppliers.length === 0 && searchTerm && (
          <div className="text-center py-8 text-gray-500">
            找不到符合的結果
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, supplierId: null })}
        onConfirm={handleDelete}
        title="確認刪除"
        description="確定要刪除此供應商嗎？此操作無法復原。"
        confirmText="刪除"
        cancelText="取消"
        isLoading={deleteSupplier.isPending}
      />
    </>
  )
}
