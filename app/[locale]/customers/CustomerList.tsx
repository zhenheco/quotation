'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import EmptyState from '@/components/ui/EmptyState'

interface Customer {
  id: string
  name: { zh: string; en: string }
  email: string
  phone: string | null
  address: { zh: string; en: string } | null
  created_at: string
}

interface CustomerListProps {
  customers: Customer[]
  locale: string
}

export default function CustomerList({ customers, locale }: CustomerListProps) {
  const t = useTranslations()
  const router = useRouter()
  const supabase = createClient()
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; customer: Customer | null }>({
    isOpen: false,
    customer: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCustomers = customers.filter((customer) => {
    const name = customer.name[locale as 'zh' | 'en']?.toLowerCase() || ''
    const email = customer.email.toLowerCase()
    const search = searchTerm.toLowerCase()
    return name.includes(search) || email.includes(search)
  })

  const handleDelete = async () => {
    if (!deleteModal.customer) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', deleteModal.customer.id)

      if (error) throw error

      setDeleteModal({ isOpen: false, customer: null })
      router.refresh()
    } catch (error) {
      console.error('Error deleting customer:', error)
      alert('Failed to delete customer')
    } finally {
      setIsDeleting(false)
    }
  }

  if (customers.length === 0) {
    return (
      <EmptyState
        icon="👥"
        title={t('customer.emptyState.title')}
        description={t('customer.emptyState.description')}
        action={{
          label: t('customer.createNew'),
          onClick: () => router.push(`/${locale}/customers/new`),
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
                  {t('customer.name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('customer.email')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('customer.phone')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('customer.address')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {customer.name[locale as 'zh' | 'en']}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{customer.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{customer.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {customer.address?.[locale as 'zh' | 'en'] || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => router.push(`/${locale}/customers/${customer.id}`)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => setDeleteModal({ isOpen: true, customer })}
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

        {filteredCustomers.length === 0 && searchTerm && (
          <div className="text-center py-8 text-gray-500">
            {t('common.noResults')}
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, customer: null })}
        onConfirm={handleDelete}
        title={t('customer.deleteConfirm.title')}
        description={t('customer.deleteConfirm.description')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        isLoading={isDeleting}
      />
    </>
  )
}
