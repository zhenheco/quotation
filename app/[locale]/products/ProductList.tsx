'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import EmptyState from '@/components/ui/EmptyState'
import ProductCostDisplay from '@/components/products/ProductCostDisplay'
import { useCanViewCost } from '@/hooks/usePermission'

interface Product {
  id: string
  name: { zh: string; en: string }
  description: { zh: string; en: string } | null
  unit_price: number
  currency: string
  category: string | null
  cost_price?: number | null
  cost_currency?: string | null
  created_at: string
}

interface ProductListProps {
  products: Product[]
  locale: string
}

type ViewMode = 'list' | 'card'

export default function ProductList({ products, locale }: ProductListProps) {
  const t = useTranslations()
  const router = useRouter()
  const { hasPermission: canViewCost } = useCanViewCost()
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; product: Product | null }>({
    isOpen: false,
    product: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const filteredProducts = products.filter((product) => {
    const name = product.name[locale as 'zh' | 'en']?.toLowerCase() || ''
    const category = product.category?.toLowerCase() || ''
    const search = searchTerm.toLowerCase()
    return name.includes(search) || category.includes(search)
  })

  const handleDelete = async () => {
    if (!deleteModal.product) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/products/${deleteModal.product.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete product')
      }

      setDeleteModal({ isOpen: false, product: null })
      router.refresh()
    } catch (error) {
      console.error('Error deleting product:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete product')
    } finally {
      setIsDeleting(false)
    }
  }

  if (products.length === 0) {
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
          <input
            type="text"
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* View mode toggle buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="條列檢視"
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
                  {canViewCost && (
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
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {product.name[locale as 'zh' | 'en']}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {product.description?.[locale as 'zh' | 'en'] || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.category || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.currency} {product.unit_price.toLocaleString()}
                      </div>
                    </td>
                    {canViewCost && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {product.cost_price ? (
                            <>
                              {product.cost_currency || product.currency} {product.cost_price.toLocaleString()}
                              {product.cost_price && product.cost_currency === product.currency && (
                                <div className="text-xs text-green-600 mt-1">
                                  {t('product.profit_margin')}: {(((product.unit_price - product.cost_price) / product.cost_price) * 100).toFixed(1)}%
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
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Card View */}
        {viewMode === 'card' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {product.name[locale as 'zh' | 'en']}
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    {product.description?.[locale as 'zh' | 'en'] && (
                      <p className="line-clamp-2">{product.description[locale as 'zh' | 'en']}</p>
                    )}
                    <div className="flex items-center gap-2 text-gray-500">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span className="text-xs">{product.category || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <svg className="w-5 h-5 flex-shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-base font-semibold text-gray-900">
                        {product.currency} {product.unit_price.toLocaleString()}
                      </span>
                    </div>
                    {canViewCost && product.cost_price && (
                      <div className="pt-2 mt-2 border-t border-gray-100">
                        <ProductCostDisplay
                          costPrice={product.cost_price}
                          costCurrency={product.cost_currency}
                          basePrice={product.unit_price}
                          currency={product.currency}
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
            ))}
          </div>
        )}

        {filteredProducts.length === 0 && searchTerm && (
          <div className="text-center py-8 text-gray-500">
            {t('common.noResults')}
          </div>
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
        isLoading={isDeleting}
      />
    </>
  )
}
