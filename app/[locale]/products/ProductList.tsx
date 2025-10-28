'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import EmptyState from '@/components/ui/EmptyState'
import ProductCostDisplay from '@/components/products/ProductCostDisplay'
import {
  useFilteredProducts,
  useDeleteProduct,
  useProductCategories,
  type Product,
  type ProductFilters,
} from '@/hooks/useProducts'

interface ProductListProps {
  locale: string
}

type ViewMode = 'list' | 'card'

export default function ProductList({ locale }: ProductListProps) {
  const t = useTranslations()
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
      toast.success(t('product.deleteSuccess'))
      setDeleteModal({ isOpen: false, product: null })
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error(
        error instanceof Error ? error.message : t('product.deleteFailed')
      )
    }
  }

  // 載入狀態
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error instanceof Error ? error.message : t('common.error')}
        </div>
      </div>
    )
  }

  // 空狀態
  if (!products || products.length === 0) {
    return (
      <EmptyState
        icon="📦"
        title={t('product.emptyState.title')}
        description={t('product.emptyState.description')}
        action={{
          label: t('product.createNew'),
          onClick: () => router.push(`/${locale}/products/new`),
        }}
      />
    )
  }

  return (
    <>
      <div className="p-6">
        <div className="mb-4 space-y-3">
          {/* 搜尋框 */}
          <input
            type="text"
            placeholder={t('common.search')}
            value={filters.search || ''}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* 篩選器與視圖切換 */}
          <div className="flex items-center justify-between gap-4">
            {/* 分類篩選 */}
            <select
              value={filters.category || ''}
              onChange={(e) => updateFilters({ category: e.target.value || undefined })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t('product.allCategories')}</option>
              {categories?.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            {/* View mode toggle buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={t('product.listView')}
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
                title={t('product.cardView')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* List View */}
        {viewMode === 'list' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('product.name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('product.description')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('product.category')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('product.price')}
                  </th>
                  {canSeeCost && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('product.cost')}
                    </th>
                  )}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => {
                  const name = product.name as { zh: string; en: string }
                  const description = product.description as { zh: string; en: string } | null

                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {name[locale as 'zh' | 'en']}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {description?.[locale as 'zh' | 'en'] || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{product.category || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {product.base_currency} {product.base_price.toLocaleString()}
                        </div>
                      </td>
                      {canSeeCost && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {product.cost_price ? (
                              <>
                                {product.cost_currency || product.base_currency}{' '}
                                {product.cost_price.toLocaleString()}
                                {product.cost_price &&
                                  product.cost_currency === product.base_currency && (
                                    <div className="text-xs text-green-600 mt-1">
                                      {t('product.profit_margin')}:{' '}
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => router.push(`/${locale}/products/${product.id}`)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4 cursor-pointer"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, product })}
                          className="text-red-600 hover:text-red-900 cursor-pointer"
                        >
                          {t('common.delete')}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Card View */}
        {viewMode === 'card' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => {
              const name = product.name as { zh: string; en: string }
              const description = product.description as { zh: string; en: string } | null

              return (
                <div
                  key={product.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {name[locale as 'zh' | 'en']}
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      {description?.[locale as 'zh' | 'en'] && (
                        <p className="line-clamp-2">{description[locale as 'zh' | 'en']}</p>
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
                          {product.base_currency} {product.base_price.toLocaleString()}
                        </span>
                      </div>
                      {canSeeCost && product.cost_price && (
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
                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => router.push(`/${locale}/products/${product.id}`)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => setDeleteModal({ isOpen: true, product })}
                      className="flex-1 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {products.length === 0 && filters.search && (
          <div className="text-center py-8 text-gray-500">{t('common.noResults')}</div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, product: null })}
        onConfirm={handleDelete}
        title={t('product.deleteConfirm.title')}
        description={t('product.deleteConfirm.description')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        isLoading={deleteProduct.isPending}
      />
    </>
  )
}
