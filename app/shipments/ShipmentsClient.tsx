'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { getSelectedCompanyId } from '@/lib/utils/company-context'
import {
  useShipments,
  useShipmentStats,
  useDeleteShipment,
  useShipShipment,
  useDeliverShipment,
  useCancelShipment,
  type ShipmentStatus,
  type ShipmentWithRelations,
} from '@/hooks/useShipments'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/format'
import type { Currency } from '@/lib/services/exchange-rate'
import { Truck, Package, ExternalLink } from 'lucide-react'

// 狀態標籤樣式
const statusStyles: Record<ShipmentStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-slate-100', text: 'text-slate-700', label: '待出貨' },
  in_transit: { bg: 'bg-amber-100', text: 'text-amber-700', label: '運送中' },
  delivered: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '已送達' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: '已取消' },
}

// 出貨單卡片組件
function ShipmentCard({
  shipment,
  onViewDetails,
  onShip,
  onDeliver,
  onCancel,
  onDelete,
  isShipping,
  isDelivering,
  isCancelling,
  isDeleting,
}: {
  shipment: ShipmentWithRelations
  onViewDetails: () => void
  onShip: () => void
  onDeliver: () => void
  onCancel: () => void
  onDelete: () => void
  isShipping: boolean
  isDelivering: boolean
  isCancelling: boolean
  isDeleting: boolean
}) {
  const status = statusStyles[shipment.status]
  const customerName = shipment.customer?.name?.zh || shipment.customer?.name?.en || '未知客戶'

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-800 text-lg">{shipment.shipment_number}</h3>
            <p className="text-sm text-slate-500 mt-1">{customerName}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
            {status.label}
          </span>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p className="text-slate-500">出貨日期</p>
            <p className="font-medium text-slate-700">{shipment.shipped_date || '-'}</p>
          </div>
          <div>
            <p className="text-slate-500">預計送達</p>
            <p className="font-medium text-slate-700">{shipment.expected_delivery || '-'}</p>
          </div>
          <div>
            <p className="text-slate-500">物流公司</p>
            <p className="font-medium text-slate-700">{shipment.carrier || '-'}</p>
          </div>
          <div>
            <p className="text-slate-500">總金額</p>
            <p className="font-semibold text-emerald-600">
              {formatCurrency(shipment.total_amount, shipment.currency as Currency)}
            </p>
          </div>
        </div>

        {/* 追蹤號碼 */}
        {shipment.tracking_number && (
          <div className="mb-4 text-sm">
            <p className="text-slate-500">追蹤號碼</p>
            <div className="flex items-center gap-2">
              <p className="font-mono text-slate-800">{shipment.tracking_number}</p>
              {shipment.tracking_url && (
                <a
                  href={shipment.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* 關聯訂單 */}
        {shipment.order && (
          <div className="mb-4 text-sm">
            <p className="text-slate-500">來源訂單</p>
            <p className="font-medium text-blue-600">{shipment.order.order_number}</p>
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

          {shipment.status === 'pending' && (
            <>
              <button
                onClick={onShip}
                disabled={isShipping}
                className="px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {isShipping ? '處理中...' : '標記出貨'}
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

          {shipment.status === 'in_transit' && (
            <>
              <button
                onClick={onDeliver}
                disabled={isDelivering}
                className="px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDelivering ? '處理中...' : '標記送達'}
              </button>
              <button
                onClick={onCancel}
                disabled={isCancelling}
                className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {isCancelling ? '取消中...' : '取消出貨'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ShipmentsClient() {
  const router = useRouter()
  const companyId = getSelectedCompanyId() || ''

  // State
  const [filter, setFilter] = useState<'all' | ShipmentStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Hooks
  const { data: shipments = [], isLoading, error } = useShipments(
    companyId,
    filter !== 'all' ? { status: filter } : undefined
  )
  const { data: stats } = useShipmentStats(companyId)
  const deleteShipment = useDeleteShipment(companyId)
  const shipShipment = useShipShipment(companyId)
  const deliverShipment = useDeliverShipment(companyId)
  const cancelShipment = useCancelShipment(companyId)

  // 搜尋過濾
  const filteredShipments = shipments.filter((shipment) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const customerName = shipment.customer?.name?.zh || shipment.customer?.name?.en || ''
      return (
        shipment.shipment_number.toLowerCase().includes(query) ||
        customerName.toLowerCase().includes(query) ||
        (shipment.tracking_number?.toLowerCase().includes(query) ?? false)
      )
    }
    return true
  })

  // 處理標記出貨
  const handleShip = async (shipmentId: string) => {
    try {
      await shipShipment.mutateAsync({ shipmentId })
      toast.success('已標記為運送中')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失敗')
    }
  }

  // 處理標記送達
  const handleDeliver = async (shipmentId: string) => {
    try {
      await deliverShipment.mutateAsync({ shipmentId })
      toast.success('已標記為送達')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失敗')
    }
  }

  // 處理取消出貨
  const handleCancel = async (shipmentId: string) => {
    if (!confirm('確定要取消此出貨單嗎？')) return
    try {
      await cancelShipment.mutateAsync(shipmentId)
      toast.success('出貨單已取消')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '取消失敗')
    }
  }

  // 處理刪除出貨單
  const handleDelete = async (shipmentId: string) => {
    if (!confirm('確定要刪除此出貨單嗎？此操作無法復原。')) return
    try {
      await deleteShipment.mutateAsync(shipmentId)
      toast.success('出貨單已刪除')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '刪除失敗')
    }
  }

  if (!companyId) {
    return (
      <div className="container mx-auto">
        <EmptyState
          icon="🏢"
          title="請先選擇公司"
          description="您需要先選擇一個公司才能查看出貨單"
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
        title="出貨管理"
        description="追蹤和管理您的出貨單與物流狀態"
      />

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <p className="text-sm text-slate-500">全部出貨單</p>
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-500" />
              <p className="text-sm text-slate-500">待出貨</p>
            </div>
            <p className="text-2xl font-bold text-slate-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-500" />
              <p className="text-sm text-slate-500">運送中</p>
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.in_transit}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <p className="text-sm text-slate-500">已送達</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.delivered}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <p className="text-sm text-slate-500">已取消</p>
            <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜尋出貨單編號、客戶名稱或追蹤號碼..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'in_transit', 'delivered', 'cancelled'] as const).map((status) => (
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

      {/* Shipments List */}
      {filteredShipments.length === 0 ? (
        <EmptyState
          icon="📦"
          title="尚無出貨單"
          description="您可以從訂單建立出貨單"
          action={{
            label: '前往訂單',
            onClick: () => router.push('/orders'),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredShipments.map((shipment) => (
            <ShipmentCard
              key={shipment.id}
              shipment={shipment}
              onViewDetails={() => router.push(`/shipments/${shipment.id}`)}
              onShip={() => handleShip(shipment.id)}
              onDeliver={() => handleDeliver(shipment.id)}
              onCancel={() => handleCancel(shipment.id)}
              onDelete={() => handleDelete(shipment.id)}
              isShipping={shipShipment.isPending}
              isDelivering={deliverShipment.isPending}
              isCancelling={cancelShipment.isPending}
              isDeleting={deleteShipment.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}
