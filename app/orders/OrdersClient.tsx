'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { getSelectedCompanyId } from '@/lib/utils/company-context'
import {
  useOrders,
  useOrderStats,
  useDeleteOrder,
  useConfirmOrder,
  useCancelOrder,
  type OrderStatus,
  type OrderWithCustomer,
} from '@/hooks/useOrders'
import { useCreateShipmentFromOrder } from '@/hooks/useShipments'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/format'
import type { Currency } from '@/lib/services/exchange-rate'

// 狀態標籤樣式
const statusStyles: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-700', label: '草稿' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', label: '已確認' },
  shipped: { bg: 'bg-amber-100', text: 'text-amber-700', label: '已出貨' },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '已完成' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: '已取消' },
}

// 訂單卡片組件
function OrderCard({
  order,
  onViewDetails,
  onConfirm,
  onCancel,
  onDelete,
  onCreateShipment,
  isConfirming,
  isCancelling,
  isDeleting,
  isCreatingShipment,
}: {
  order: OrderWithCustomer
  onViewDetails: () => void
  onConfirm: () => void
  onCancel: () => void
  onDelete: () => void
  onCreateShipment: () => void
  isConfirming: boolean
  isCancelling: boolean
  isDeleting: boolean
  isCreatingShipment: boolean
}) {
  const status = statusStyles[order.status]
  const customerName = order.customer?.name?.zh || order.customer?.name?.en || '未知客戶'

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-800 text-lg">{order.order_number}</h3>
            <p className="text-sm text-slate-500 mt-1">{customerName}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
            {status.label}
          </span>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p className="text-slate-500">訂單日期</p>
            <p className="font-medium text-slate-700">{order.order_date}</p>
          </div>
          <div>
            <p className="text-slate-500">預計交貨</p>
            <p className="font-medium text-slate-700">{order.expected_delivery_date || '-'}</p>
          </div>
          <div>
            <p className="text-slate-500">幣別</p>
            <p className="font-medium text-slate-700">{order.currency}</p>
          </div>
          <div>
            <p className="text-slate-500">總金額</p>
            <p className="font-semibold text-emerald-600">
              {formatCurrency(order.total_amount, order.currency as Currency)}
            </p>
          </div>
        </div>

        {/* 關聯報價單 */}
        {order.quotation && (
          <div className="mb-4 text-sm">
            <p className="text-slate-500">來源報價單</p>
            <p className="font-medium text-blue-600">{order.quotation.quotation_number}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={onViewDetails}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            查看詳情
          </button>

          {order.status === 'draft' && (
            <>
              <button
                onClick={onConfirm}
                disabled={isConfirming}
                className="px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {isConfirming ? '確認中...' : '確認訂單'}
              </button>
              <button
                onClick={onDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? '刪除中...' : '刪除'}
              </button>
            </>
          )}

          {order.status === 'confirmed' && (
            <>
              <button
                onClick={onCreateShipment}
                disabled={isCreatingShipment}
                className="px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {isCreatingShipment ? '建立中...' : '建立出貨單'}
              </button>
              <button
                onClick={onCancel}
                disabled={isCancelling}
                className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {isCancelling ? '取消中...' : '取消訂單'}
              </button>
            </>
          )}

          {(order.status === 'shipped') && (
            <button
              onClick={onCancel}
              disabled={isCancelling}
              className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {isCancelling ? '取消中...' : '取消訂單'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function OrdersClient() {
  const router = useRouter()
  const companyId = getSelectedCompanyId() || ''

  // State
  const [filter, setFilter] = useState<'all' | OrderStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Hooks
  const { data: orders = [], isLoading, error } = useOrders(
    companyId,
    filter !== 'all' ? { status: filter } : undefined
  )
  const { data: stats } = useOrderStats(companyId)
  const deleteOrder = useDeleteOrder(companyId)
  const confirmOrder = useConfirmOrder(companyId)
  const cancelOrder = useCancelOrder(companyId)
  const createShipmentFromOrder = useCreateShipmentFromOrder()

  // 搜尋過濾
  const filteredOrders = orders.filter((order) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const customerName = order.customer?.name?.zh || order.customer?.name?.en || ''
      return (
        order.order_number.toLowerCase().includes(query) ||
        customerName.toLowerCase().includes(query)
      )
    }
    return true
  })

  // 處理確認訂單
  const handleConfirm = async (orderId: string) => {
    try {
      await confirmOrder.mutateAsync(orderId)
      toast.success('訂單已確認')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '確認訂單失敗')
    }
  }

  // 處理取消訂單
  const handleCancel = async (orderId: string) => {
    if (!confirm('確定要取消此訂單嗎？')) return
    try {
      await cancelOrder.mutateAsync(orderId)
      toast.success('訂單已取消')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '取消訂單失敗')
    }
  }

  // 處理刪除訂單
  const handleDelete = async (orderId: string) => {
    if (!confirm('確定要刪除此訂單嗎？此操作無法復原。')) return
    try {
      await deleteOrder.mutateAsync(orderId)
      toast.success('訂單已刪除')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '刪除訂單失敗')
    }
  }

  // 處理建立出貨單
  const handleCreateShipment = async (orderId: string) => {
    try {
      const shipment = await createShipmentFromOrder.mutateAsync({ orderId, shipAll: true })
      toast.success('出貨單已建立')
      router.push(`/shipments/${shipment.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '建立出貨單失敗')
    }
  }

  if (!companyId) {
    return (
      <div className="container mx-auto">
        <EmptyState
          icon="🏢"
          title="請先選擇公司"
          description="您需要先選擇一個公司才能查看訂單"
        />
      </div>
    )
  }

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
        title="訂單管理"
        description="管理您的銷售訂單與出貨流程"
        action={{
          label: '新增訂單',
          href: '/orders/new',
        }}
      />

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <p className="text-sm text-slate-500">全部訂單</p>
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <p className="text-sm text-slate-500">草稿</p>
            <p className="text-2xl font-bold text-slate-600">{stats.draft}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <p className="text-sm text-slate-500">已確認</p>
            <p className="text-2xl font-bold text-blue-600">{stats.confirmed}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <p className="text-sm text-slate-500">已出貨</p>
            <p className="text-2xl font-bold text-amber-600">{stats.shipped}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <p className="text-sm text-slate-500">已完成</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜尋訂單編號或客戶名稱..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'draft', 'confirmed', 'shipped', 'completed', 'cancelled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {status === 'all' ? '全部' : statusStyles[status].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-6">
          {error.message}
        </div>
      )}

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon="📦"
          title="尚無訂單"
          description="您可以從報價單轉換或直接建立新訂單"
          action={{
            label: '新增訂單',
            onClick: () => router.push('/orders/new'),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onViewDetails={() => router.push(`/orders/${order.id}`)}
              onConfirm={() => handleConfirm(order.id)}
              onCancel={() => handleCancel(order.id)}
              onDelete={() => handleDelete(order.id)}
              onCreateShipment={() => handleCreateShipment(order.id)}
              isConfirming={confirmOrder.isPending}
              isCancelling={cancelOrder.isPending}
              isDeleting={deleteOrder.isPending}
              isCreatingShipment={createShipmentFromOrder.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}
