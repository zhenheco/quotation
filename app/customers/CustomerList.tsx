'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import EmptyState from '@/components/ui/EmptyState'
import { useSearchCustomers, useDeleteCustomer } from '@/hooks/useCustomers'

type ViewMode = 'list' | 'card'

export default function CustomerList() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; customerId: string | null }>({
    isOpen: false,
    customerId: null,
  })

  // 使用 hooks 取得資料
  const { data: customers, isLoading, error } = useSearchCustomers(searchTerm)
  const deleteCustomer = useDeleteCustomer()

  // 刪除處理
  const handleDelete = async () => {
    if (!deleteModal.customerId) return

    try {
      await deleteCustomer.mutateAsync(deleteModal.customerId)
      toast.success('客戶已刪除')
      setDeleteModal({ isOpen: false, customerId: null })
    } catch (error) {
      console.error('Error deleting customer:', error)
      toast.error(error instanceof Error ? error.message : '刪除客戶失敗')
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
          {error instanceof Error ? error.message : '載入客戶失敗'}
        </div>
      </div>
    )
  }

  // 空狀態
  if (!customers || customers.length === 0) {
    return (
      <EmptyState
        icon="👥"
        title="尚無客戶資料"
        description="新增您的第一位客戶以開始建立報價單"
        action={{
          label: '新增客戶',
          onClick: () => router.push('/customers/new'),
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
                    客戶名稱
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    統一編號
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    電子郵件
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    電話
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    傳真
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    地址
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer) => {
                  const name = customer.name as { zh: string; en: string }
                  const address = customer.address as { zh: string; en: string } | null

                  return (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {name.zh || name.en}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{customer.tax_id || '-'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{customer.email}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{customer.phone || '-'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{customer.fax || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {address?.zh || address?.en || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => router.push(`/customers/${customer.id}`)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4 cursor-pointer"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, customerId: customer.id })}
                          className="text-red-600 hover:text-red-900 cursor-pointer"
                          disabled={deleteCustomer.isPending}
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
            {customers.map((customer) => {
              const name = customer.name as { zh: string; en: string }
              const address = customer.address as { zh: string; en: string } | null

              return (
                <div
                  key={customer.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="mb-3">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {name.zh || name.en}
                    </h3>
                    {customer.tax_id && (
                      <p className="text-xs text-gray-500 mb-2">統一編號: {customer.tax_id}</p>
                    )}
                    <div className="space-y-1.5 text-sm text-gray-600">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="break-all">{customer.email}</span>
                      </div>
                      {customer.phone && (
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      {customer.fax && (
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>{customer.fax}</span>
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
                    </div>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => router.push(`/customers/${customer.id}`)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => setDeleteModal({ isOpen: true, customerId: customer.id })}
                      disabled={deleteCustomer.isPending}
                      className="flex-1 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              )
            })}
        </div>

        {customers.length === 0 && searchTerm && (
          <div className="text-center py-8 text-gray-500">
            找不到符合的結果
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, customerId: null })}
        onConfirm={handleDelete}
        title="確認刪除"
        description="確定要刪除此客戶嗎？此操作無法復原。"
        confirmText="刪除"
        cancelText="取消"
        isLoading={deleteCustomer.isPending}
      />
    </>
  )
}
