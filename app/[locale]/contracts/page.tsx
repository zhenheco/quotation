'use client'

import { use, useState } from 'react'
import { useTranslations } from 'next-intl'
import Sidebar from '@/components/Sidebar'
import Navbar from '@/components/Navbar'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import ContractCard from '@/components/contracts/ContractCard'
import { useContracts } from '@/hooks/useContracts'

export default function ContractsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const t = useTranslations()
  const { contracts, loading, error } = useContracts()
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'overdue'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter contracts
  const filteredContracts = contracts.filter((contract) => {
    // Status filter
    if (filter === 'active' && contract.status !== 'active') return false
    if (filter === 'expired' && contract.status !== 'expired') return false
    if (filter === 'overdue') {
      const isOverdue = contract.status === 'active' && new Date(contract.end_date) < new Date()
      if (!isOverdue) return false
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const customerName = locale === 'zh' ? contract.customer.company_name_zh : contract.customer.company_name_en
      return (
        contract.contract_number.toLowerCase().includes(query) ||
        contract.title.toLowerCase().includes(query) ||
        customerName.toLowerCase().includes(query)
      )
    }

    return true
  })

  // Count overdue contracts
  const overdueCount = contracts.filter((contract) => {
    return contract.status === 'active' && new Date(contract.end_date) < new Date()
  }).length

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar locale={locale} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar locale={locale} />
          <main className="flex-1 overflow-y-auto flex items-center justify-center">
            <LoadingSpinner />
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar locale={locale} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar locale={locale} />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-8">
            <PageHeader
              title={t('contracts.title')}
              description={t('contracts.description')}
              action={{
                label: t('contracts.createFromQuotation'),
                href: `/${locale}/contracts/new`,
              }}
            />

            {/* Overdue Alert */}
            {overdueCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
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
                title={t('contracts.emptyState.title')}
                description={t('contracts.emptyState.description')}
                action={{
                  label: t('contracts.createFromQuotation'),
                  href: `/${locale}/contracts/new`,
                }}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredContracts.map((contract) => (
                  <ContractCard
                    key={contract.id}
                    contract={contract}
                    progress={null}
                    locale={locale}
                    onViewDetails={() => {
                      window.location.href = `/${locale}/contracts/${contract.id}`
                    }}
                    onRecordPayment={() => {
                      // Open payment modal
                      console.log('Record payment for contract:', contract.id)
                    }}
                    onSendReminder={() => {
                      // Send reminder
                      console.log('Send reminder for contract:', contract.id)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
