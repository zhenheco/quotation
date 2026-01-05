'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import EmptyState from '@/components/ui/EmptyState'
import ProductCostDisplay from '@/components/products/ProductCostDisplay'
import { safeToLocaleString } from '@/lib/utils/formatters'
import {
  useFilteredProducts,
  useDeleteProduct,
  useProductCategories,
  type Product,
  type ProductFilters,
} from '@/hooks/useProducts'

type ViewMode = 'list' | 'card'

export default function ProductList() {
  const router = useRouter()
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; product: Product | null }>({
    isOpen: false,
    product: null,
  })
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    category: '',
  })

  // 使用 hooks
  const { data: products, isLoading, error, canSeeCost } = useFilteredProducts(filters)
  const { data: categories } = useProductCategories()
  const deleteProduct = useDeleteProduct()

  // 更新篩選條件
  const updateFilters = (newFilters: Partial<ProductFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  const handleDelete = async () => {
    if (!deleteModal.product) return

    try {
      await deleteProduct.mutateAsync(deleteModal.product.id)
      toast.success('產品刪除成功')
      setDeleteModal({ isOpen: false, product: null })
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error(
        error instanceof Error ? error.message : '刪除產品失敗'
      )
    }
  }

  // 載入狀態
  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error instanceof Error ? error.message : '發生錯誤'}
        </div>
      </div>
    )
  }

  // 空狀態
  if (!products || products.length === 0) {
    return (
      <EmptyState
        icon="📦"
        title="尚無產品"
        description="開始新增您的第一個產品"
        action={{
          label: '新增產品',
          onClick: () => router.push('/products/new'),
        }}
      />
    )
  }

  return (
    <>
      <div className="p-4">
        <div className="mb-3 space-y-2">
          {/* 搜尋框 */}
          <input
            type="text"
            placeholder="搜尋..."
            value={filters.search || ''}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* 篩選器與視圖切換 */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* 分類篩選 */}
            <select
              value={filters.category || ''}
              onChange={(e) => updateFilters({ category: e.target.value || undefined })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
            >
              <option value="">全部分類</option>
              {categories?.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

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
        </div>

        {/* List View - 只在桌面版且選擇 list 模式時顯示 */}
        {viewMode === 'list' && (
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    產品名稱
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    描述
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    分類
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    售價
                  </th>
                  {canSeeCost && (
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      成本
                    </th>
                  )}
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => {
                  const name = product.name as { zh: string; en: string }
                  const description = product.description as { zh: string; en: string } | null

                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {name.zh || name.en}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {description?.zh || description?.en || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{product.category || '-'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {product.base_currency} {product.base_price?.toLocaleString() || 0}
                        </div>
                      </td>
                      {canSeeCost && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {product.cost_price ? (
                              <>
                                {product.cost_currency || product.base_currency}{' '}
                                {safeToLocaleString(product.cost_price)}
                                {product.cost_price &&
                                  product.base_price &&
                                  product.cost_currency === product.base_currency && (
                                    <div className="text-xs text-green-600 mt-1">
                                      利潤率:{' '}
                                      {(
                                        ((product.base_price - product.cost_price) /
                                          product.cost_price) *
                                        100
                                      ).toFixed(1)}
                                      %
                                    </div>
                                  )}
                              </>
                            ) : (
                              '-'
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => router.push(`/products/${product.id}`)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4 cursor-pointer"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, product })}
                          className="text-red-600 hover:text-red-900 cursor-pointer"
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
            {products.map((product) => {
              const name = product.name as { zh: string; en: string }
              const description = product.description as { zh: string; en: string } | null

              return (
                <div
                  key={product.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {name.zh || name.en}
                    </h3>
                    <div className="space-y-1.5 text-sm text-gray-600">
                      {(description?.zh || description?.en) && (
                        <p className="line-clamp-2">{description.zh || description.en}</p>
                      )}
                      <div className="flex items-center gap-2 text-gray-500">
                        <svg
                          className="w-4 h-4 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                          />
                        </svg>
                        <span className="text-xs">{product.category || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <svg
                          className="w-5 h-5 flex-shrink-0 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="text-base font-semibold text-gray-900">
                          {product.base_currency} {product.base_price?.toLocaleString() || 0}
                        </span>
                      </div>
                      {canSeeCost && product.cost_price && product.base_price && (
                        <div className="pt-2 mt-2 border-t border-gray-100">
                          <ProductCostDisplay
                            costPrice={product.cost_price}
                            costCurrency={product.cost_currency}
                            basePrice={product.base_price}
                            currency={product.base_currency}
                            showCalculations={true}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => router.push(`/products/${product.id}`)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => setDeleteModal({ isOpen: true, product })}
                      className="flex-1 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              )
            })}
        </div>

        {products.length === 0 && filters.search && (
          <div className="text-center py-8 text-gray-500">無搜尋結果</div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, product: null })}
        onConfirm={handleDelete}
        title="確認刪除"
        description="確定要刪除此產品嗎？此操作無法復原。"
        confirmText="刪除"
        cancelText="取消"
        isLoading={deleteProduct.isPending}
      />
    </>
  )
}
