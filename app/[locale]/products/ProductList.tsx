'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import EmptyState from '@/components/ui/EmptyState'

interface Product {
  id: string
  name: { zh: string; en: string }
  description: { zh: string; en: string } | null
  base_price: number
  base_currency: string
  category: string | null
  created_at: string
}

interface ProductListProps {
  products: Product[]
  locale: string
}

export default function ProductList({ products, locale }: ProductListProps) {
  const t = useTranslations()
  const router = useRouter()
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; product: Product | null }>({
    isOpen: false,
    product: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

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
        <div className="mb-4">
          <input
            type="text"
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

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
