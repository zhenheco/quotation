'use client'

import { use } from 'react'

// Force dynamic rendering to avoid build-time prerendering
export const dynamic = 'force-dynamic'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import PageHeader from '@/components/ui/PageHeader'
import PaymentProgressBar from '@/components/contracts/PaymentProgressBar'
import { useContractDetail, useUpdateNextCollection } from '@/hooks/useContracts'
import { useContractPayments } from '@/hooks/usePayments'
import { toast } from 'sonner'
import { useState } from 'react'
import { safeToLocaleString } from '@/lib/utils/formatters'

export default function ContractDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = use(params)
  const t = useTranslations()
  const router = useRouter()

  // Fetch contract and payment progress
  const { contract, progress, isLoading, error } = useContractDetail(id)
  const { data: payments, isLoading: paymentsLoading } = useContractPayments(id)
  const updateNextCollection = useUpdateNextCollection(id)

  const [showNextCollectionForm, setShowNextCollectionForm] = useState(false)
  const [nextCollectionDate, setNextCollectionDate] = useState('')
  const [nextCollectionAmount, setNextCollectionAmount] = useState('')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('contracts.notFound')}
          </h2>
          <p className="text-gray-600 mb-4">{t('contracts.notFoundDescription')}</p>
          <button
            onClick={() => router.push(`/${locale}/contracts`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('contracts.backToList')}
          </button>
        </div>
      </div>
    )
  }

  const customerName =
    locale === 'zh' ? contract.customer.company_name_zh : contract.customer.company_name_en

  const handleUpdateNextCollection = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nextCollectionDate || !nextCollectionAmount) {
      toast.error(t('contracts.nextCollection.validationError'))
      return
    }

    try {
      await updateNextCollection.mutateAsync({
        next_collection_date: nextCollectionDate,
        next_collection_amount: parseFloat(nextCollectionAmount),
      })
      toast.success(t('contracts.nextCollection.updateSuccess'))
      setShowNextCollectionForm(false)
      setNextCollectionDate('')
      setNextCollectionAmount('')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('contracts.nextCollection.updateError')
      )
    }
  }

  return (
    <div className="container mx-auto">
            <PageHeader
              title={contract.title}
              description={`${t('contracts.contractNumber')}: ${contract.contract_number}`}
              action={{
                label: t('contracts.backToList'),
                href: `/${locale}/contracts`,
              }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Contract Details Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">{t('contracts.details')}</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">{t('contracts.customer')}</p>
                      <p className="font-medium">{customerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('contracts.status')}</p>
                      <span
                        className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                          contract.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : contract.status === 'expired'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {t(`contracts.status.${contract.status}`)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('contracts.signedDate')}</p>
                      <p className="font-medium">
                        {new Date(contract.signed_date || contract.start_date).toLocaleDateString(
                          locale
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('contracts.startDate')}</p>
                      <p className="font-medium">
                        {new Date(contract.start_date).toLocaleDateString(locale)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('contracts.endDate')}</p>
                      <p className="font-medium">
                        {new Date(contract.end_date).toLocaleDateString(locale)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('contracts.totalAmount')}</p>
                      <p className="font-medium">
                        {safeToLocaleString(contract.total_amount)} {contract.currency}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{t('contracts.paymentFrequency')}</p>
                      <p className="font-medium">
                        {contract.payment_terms
                          ? t(`contracts.payment_terms.${contract.payment_terms}`)
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Progress Card */}
                {progress && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">
                      {t('contracts.paymentProgress')}
                    </h2>
                    <PaymentProgressBar
                      totalAmount={progress.total_amount}
                      totalPaid={progress.total_paid}
                      totalPending={progress.total_pending}
                      totalOverdue={progress.total_overdue}
                      currency={progress.currency}
                      paymentCompletionRate={progress.payment_completion_rate}
                    />
                  </div>
                )}

                {/* Payment History */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">{t('contracts.paymentHistory')}</h2>
                  {paymentsLoading ? (
                    <LoadingSpinner />
                  ) : payments && payments.length > 0 ? (
                    <div className="space-y-3">
                      {payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="border-l-4 border-green-500 pl-4 py-2"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">
                                {safeToLocaleString(payment.amount)} {payment.currency}
                              </p>
                              <p className="text-sm text-gray-600">
                                {new Date(payment.payment_date).toLocaleDateString(locale)}
                              </p>
                            </div>
                            {payment.payment_method && (
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {t(`payments.payment_method.${payment.payment_method}`)}
                              </span>
                            )}
                          </div>
                          {payment.notes && (
                            <p className="text-sm text-gray-500 mt-1">{payment.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      {t('contracts.noPaymentHistory')}
                    </p>
                  )}
                </div>
              </div>

              {/* Sidebar Actions */}
              <div className="space-y-4">
                {/* Next Collection Card */}
                {contract.next_collection_date && contract.next_collection_amount && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">
                      {t('contracts.nextCollection')}
                    </h3>
                    <p className="text-sm text-blue-800">
                      {new Date(contract.next_collection_date).toLocaleDateString(locale)}
                    </p>
                    <p className="text-lg font-bold text-blue-900 mt-1">
                      {safeToLocaleString(contract.next_collection_amount)} {contract.currency}
                    </p>
                  </div>
                )}

                {/* Update Next Collection */}
                {contract.status === 'active' && (
                  <div className="bg-white rounded-lg shadow p-4">
                    <button
                      onClick={() => setShowNextCollectionForm(!showNextCollectionForm)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {t('contracts.updateNextCollection')}
                    </button>

                    {showNextCollectionForm && (
                      <form onSubmit={handleUpdateNextCollection} className="mt-4 space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('contracts.nextCollectionDate')}
                          </label>
                          <input
                            type="date"
                            value={nextCollectionDate}
                            onChange={(e) => setNextCollectionDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('contracts.nextCollectionAmount')}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={nextCollectionAmount}
                            onChange={(e) => setNextCollectionAmount(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={updateNextCollection.isPending}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                          >
                            {updateNextCollection.isPending
                              ? t('common.saving')
                              : t('common.save')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowNextCollectionForm(false)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow p-4 space-y-2">
                  <h3 className="font-semibold mb-2">{t('contracts.actions')}</h3>
                  <button
                    onClick={() => router.push(`/${locale}/payments?contract_id=${id}`)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    {t('contracts.recordPayment')}
                  </button>
                  <button
                    onClick={() => toast.info(t('contracts.reminderSent'))}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    {t('contracts.sendReminder')}
                  </button>
                </div>
              </div>
            </div>
    </div>
  )
}
