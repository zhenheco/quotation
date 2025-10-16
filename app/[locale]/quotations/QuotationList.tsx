'use client'

import { useState } from 'react'
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

  const filteredQuotations = quotations.filter((quotation) => {
    if (statusFilter === 'all') return true
    return quotation.status === statusFilter
  })

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
        <div className="mb-4">
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
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
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
    </>
  )
}
