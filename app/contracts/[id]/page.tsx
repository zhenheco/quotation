'use client'

import { use } from 'react'

// Force dynamic rendering to avoid build-time prerendering
export const dynamic = 'force-dynamic'
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
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
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
            找不到合約
          </h2>
          <p className="text-gray-600 mb-4">此合約不存在或已被刪除</p>
          <button
            onClick={() => router.push(`/contracts`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回合約列表
          </button>
        </div>
      </div>
    )
  }

  const customerName = contract.customer.company_name_zh || contract.customer.company_name_en

  const handleUpdateNextCollection = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nextCollectionDate || !nextCollectionAmount) {
      toast.error('請填寫收款日期和金額')
      return
    }

    try {
      await updateNextCollection.mutateAsync({
        next_collection_date: nextCollectionDate,
        next_collection_amount: parseFloat(nextCollectionAmount),
      })
      toast.success('下次收款資訊已更新')
      setShowNextCollectionForm(false)
      setNextCollectionDate('')
      setNextCollectionAmount('')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '更新下次收款資訊失敗'
      )
    }
  }

  return (
    <div className="container mx-auto">
            <PageHeader
              title={contract.title}
              description={`合約編號: ${contract.contract_number}`}
              action={{
                label: '返回合約列表',
                href: `/contracts`,
              }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Contract Details Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">合約詳情</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">客戶</p>
                      <p className="font-medium">{customerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">狀態</p>
                      <span
                        className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                          contract.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : contract.status === 'expired'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {contract.status === 'active' ? '執行中' : contract.status === 'expired' ? '已到期' : '已取消'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">簽約日期</p>
                      <p className="font-medium">
                        {new Date(contract.signed_date || contract.start_date).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">開始日期</p>
                      <p className="font-medium">
                        {new Date(contract.start_date).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">結束日期</p>
                      <p className="font-medium">
                        {new Date(contract.end_date).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">合約總額</p>
                      <p className="font-medium">
                        {safeToLocaleString(contract.total_amount)} {contract.currency}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">付款週期</p>
                      <p className="font-medium">
                        {contract.payment_terms === 'monthly' ? '每月' : contract.payment_terms === 'quarterly' ? '每季' : contract.payment_terms === 'semi_annual' ? '每半年' : contract.payment_terms === 'annual' ? '每年' : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Progress Card */}
                {progress && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">
                      收款進度
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
                  <h2 className="text-lg font-semibold mb-4">收款紀錄</h2>
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
                                {new Date(payment.payment_date).toLocaleDateString('zh-TW')}
                              </p>
                            </div>
                            {payment.payment_method && (
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {payment.payment_method === 'bank_transfer' ? '銀行轉帳' : payment.payment_method === 'cash' ? '現金' : payment.payment_method === 'check' ? '支票' : payment.payment_method === 'credit_card' ? '信用卡' : payment.payment_method}
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
                      尚無收款紀錄
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
                      下次收款
                    </h3>
                    <p className="text-sm text-blue-800">
                      {new Date(contract.next_collection_date).toLocaleDateString('zh-TW')}
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
                      更新下次收款
                    </button>

                    {showNextCollectionForm && (
                      <form onSubmit={handleUpdateNextCollection} className="mt-4 space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            收款日期
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
                            收款金額
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
                              ? '儲存中...'
                              : '儲存'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowNextCollectionForm(false)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                          >
                            取消
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow p-4 space-y-2">
                  <h3 className="font-semibold mb-2">快速操作</h3>
                  <button
                    onClick={() => router.push(`/payments?contract_id=${id}`)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    登記收款
                  </button>
                  <button
                    onClick={() => toast.info('提醒已發送')}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    發送提醒
                  </button>
                </div>
              </div>
            </div>
    </div>
  )
}
