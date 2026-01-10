'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import { getSelectedCompanyId } from '@/lib/utils/company-context'
import { useCreateOrderFromQuotation } from '@/hooks/useOrders'
import { toast } from 'sonner'

export default function NewOrderClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const companyId = getSelectedCompanyId() || ''

  // 檢查是否從報價單建立
  const quotationId = searchParams.get('quotation_id')

  // Hooks
  const createFromQuotation = useCreateOrderFromQuotation()

  // 處理從報價單建立訂單
  const handleCreateFromQuotation = async () => {
    if (!quotationId) return
    try {
      const order = await createFromQuotation.mutateAsync(quotationId)
      toast.success('訂單已建立')
      router.push(`/orders/${order.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '建立訂單失敗')
    }
  }

  if (!companyId) {
    return (
      <div className="container mx-auto">
        <EmptyState
          icon="🏢"
          title="請先選擇公司"
          description="您需要先選擇一個公司才能建立訂單"
        />
      </div>
    )
  }

  // 如果有 quotation_id，顯示確認畫面
  if (quotationId) {
    return (
      <div className="container mx-auto max-w-2xl">
        <div className="mb-6">
          <Link
            href="/quotations"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            返回報價單列表
          </Link>

          <h1 className="text-2xl font-bold text-slate-800">從報價單建立訂單</h1>
          <p className="mt-1 text-slate-500">確認後將從選取的報價單建立新訂單</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-slate-800">確認建立訂單</h3>
              <p className="text-sm text-slate-500 mt-1">
                此操作將從報價單複製所有項目到新訂單。報價單必須處於「已接受」狀態才能轉換為訂單。
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-600">
              報價單 ID: <span className="font-mono text-slate-800">{quotationId}</span>
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreateFromQuotation}
              disabled={createFromQuotation.isPending}
              className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {createFromQuotation.isPending ? '建立中...' : '確認建立訂單'}
            </button>
            <Link
              href="/quotations"
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              取消
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 手動建立訂單頁面
  return (
    <div className="container mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          返回訂單列表
        </Link>

        <h1 className="text-2xl font-bold text-slate-800">建立新訂單</h1>
        <p className="mt-1 text-slate-500">選擇建立訂單的方式</p>
      </div>

      <div className="space-y-4">
        {/* 從報價單建立 - 推薦 */}
        <Link
          href="/quotations?status=accepted"
          className="block bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
              <span className="text-2xl">📋</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-800">從報價單建立</h3>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                  推薦
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                從已接受的報價單建立訂單，自動複製客戶資訊和商品明細
              </p>
            </div>
          </div>
        </Link>

        {/* 手動建立 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 opacity-60">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">✍️</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-800">手動建立</h3>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-medium rounded">
                  即將推出
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                手動輸入客戶資訊和商品明細建立新訂單
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>提示：</strong>建議先建立報價單，待客戶確認後再轉換為訂單，這樣可以完整追蹤銷售流程。
        </p>
      </div>
    </div>
  )
}
