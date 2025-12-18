'use client'

import { use, useState } from 'react'

// Force dynamic rendering to avoid build-time prerendering
export const dynamic = 'force-dynamic'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import ContractCard from '@/components/contracts/ContractCard'
import {
  useContracts,
  useOverdueContracts,
  useExpiringContracts,
  useDeleteContract,
  type ContractFilters,
} from '@/hooks/useContracts'
import { toast } from 'sonner'

export default function ContractsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const router = useRouter()
  const t = useTranslations()
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'overdue'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Build filters for API
  const filters: ContractFilters = {}
  if (filter === 'active') filters.status = 'active'
  if (filter === 'expired') filters.status = 'expired'

  // Use the new hooks
  const { data: allContracts, isLoading, error } = useContracts(filters)
  const { data: overdueContracts } = useOverdueContracts()
  const { data: expiringContracts } = useExpiringContracts()
  const deleteContract = useDeleteContract()

  // Combine contracts based on filter
  const contracts = filter === 'overdue'
    ? (overdueContracts || [])
    : (allContracts || [])

  // Apply search filter
  const filteredContracts = contracts.filter((contract) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const customerName = locale === 'zh'
        ? contract.customer.company_name_zh
        : contract.customer.company_name_en
      return (
        contract.contract_number.toLowerCase().includes(query) ||
        contract.title.toLowerCase().includes(query) ||
        customerName.toLowerCase().includes(query)
      )
    }
    return true
  })

  // Count overdue contracts (auto-refreshes every 5 minutes)
  const overdueCount = overdueContracts?.length || 0

  // Count expiring contracts (auto-computed)
  const expiringCount = expiringContracts?.length || 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="container mx-auto">
            <PageHeader
              title={t('contracts.title')}
              description={t('contracts.description')}
              action={{
                label: t('contracts.createFromQuotation'),
                href: `/${locale}/contracts/new`,
              }}
            />

            {/* Alerts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Overdue Alert */}
              {overdueCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="font-semibold">{t('contracts.overdueAlert.title')}</h3>
                      <p className="text-sm">{overdueCount} {t('contracts.overdueAlert.description')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Expiring Alert */}
              {expiringCount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="font-semibold">{t('contracts.expiringAlert.title')}</h3>
                      <p className="text-sm">{expiringCount} {t('contracts.expiringAlert.description')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow mb-6 p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder={t('common.search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  {(['all', 'active', 'expired', 'overdue'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilter(status)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        filter === status
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {t(`contracts.filter.${status}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Contracts List */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-6">
                {error.message}
              </div>
            )}

            {filteredContracts.length === 0 ? (
              <EmptyState
                icon="📄"
                title={t('contracts.emptyState.title')}
                description={t('contracts.emptyState.description')}
                action={{
                  label: t('contracts.createFromQuotation'),
                  onClick: () => router.push(`/${locale}/contracts/new`),
                }}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredContracts.map((contract) => (
                  <ContractCard
                    key={contract.id}
                    contract={contract}
                    locale={locale}
                    onViewDetails={() => {
                      window.location.href = `/${locale}/contracts/${contract.id}`
                    }}
                    onRecordPayment={() => {
                      window.location.href = `/${locale}/payments?contract_id=${contract.id}`
                    }}
                    onSendReminder={() => {
                      toast.info(t('contracts.reminderSent'))
                    }}
                    onDelete={async () => {
                      if (!confirm(t('contracts.confirmDelete'))) return

                      try {
                        await deleteContract.mutateAsync(contract.id)
                        toast.success(t('contracts.deleteSuccess'))
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : t('contracts.deleteError')
                        )
                      }
                    }}
                  />
                ))}
              </div>
            )}
    </div>
  )
}
