'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Truck, Package, MapPin, Phone, User, ExternalLink, FileText } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { getSelectedCompanyId } from '@/lib/utils/company-context'
import {
  useShipment,
  useShipShipment,
  useDeliverShipment,
  useCancelShipment,
  useDeleteShipment,
  useCreateInvoiceFromShipment,
  type ShipmentStatus,
} from '@/hooks/useShipments'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/format'
import type { Currency } from '@/lib/services/exchange-rate'

// 狀態標籤樣式
const statusStyles: Record<ShipmentStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-slate-100', text: 'text-slate-700', label: '待出貨' },
  in_transit: { bg: 'bg-amber-100', text: 'text-amber-700', label: '運送中' },
  delivered: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '已送達' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: '已取消' },
}

interface ShipmentDetailClientProps {
  shipmentId: string
}

export default function ShipmentDetailClient({ shipmentId }: ShipmentDetailClientProps) {
  const router = useRouter()
  const companyId = getSelectedCompanyId() || ''

  // Hooks
  const { data: shipment, isLoading, error } = useShipment(companyId, shipmentId)
  const shipShipment = useShipShipment(companyId)
  const deliverShipment = useDeliverShipment(companyId)
  const cancelShipment = useCancelShipment(companyId)
  const deleteShipment = useDeleteShipment(companyId)
  const createInvoice = useCreateInvoiceFromShipment(companyId)

  // 處理標記出貨
  const handleShip = async () => {
    try {
      await shipShipment.mutateAsync({ shipmentId })
      toast.success('已標記為運送中')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失敗')
    }
  }

  // 處理標記送達
  const handleDeliver = async () => {
    try {
      await deliverShipment.mutateAsync({ shipmentId })
      toast.success('已標記為送達')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失敗')
    }
  }

  // 處理取消出貨
  const handleCancel = async () => {
    if (!confirm('確定要取消此出貨單嗎？')) return
    try {
      await cancelShipment.mutateAsync(shipmentId)
      toast.success('出貨單已取消')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '取消失敗')
    }
  }

  // 處理刪除出貨單
  const handleDelete = async () => {
    if (!confirm('確定要刪除此出貨單嗎？此操作無法復原。')) return
    try {
      await deleteShipment.mutateAsync(shipmentId)
      toast.success('出貨單已刪除')
      router.push('/shipments')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '刪除失敗')
    }
  }

  // 處理建立發票
  const handleCreateInvoice = async () => {
    try {
      const result = await createInvoice.mutateAsync({ shipmentId })
      toast.success('發票已建立')
      router.push(`/accounting/invoices/${result.invoice_id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '建立發票失敗')
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

  if (error || !shipment) {
    return (
      <div className="container mx-auto">
        <EmptyState
          icon="❌"
          title="載入失敗"
          description={error?.message || '找不到此出貨單'}
          action={{
            label: '返回列表',
            onClick: () => router.push('/shipments'),
          }}
        />
      </div>
    )
  }

  const status = statusStyles[shipment.status]
  const customerName = shipment.customer?.name?.zh || shipment.customer?.name?.en || '未知客戶'

  return (
    <div className="container mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/shipments"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          返回出貨單列表
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">{shipment.shipment_number}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                {status.label}
              </span>
            </div>
            <p className="mt-1 text-slate-500">{customerName}</p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {shipment.status === 'pending' && (
              <>
                <button
                  onClick={handleShip}
                  disabled={shipShipment.isPending}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  {shipShipment.isPending ? '處理中...' : '標記出貨'}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteShipment.isPending}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {deleteShipment.isPending ? '刪除中...' : '刪除'}
                </button>
              </>
            )}

            {shipment.status === 'in_transit' && (
              <>
                <button
                  onClick={handleDeliver}
                  disabled={deliverShipment.isPending}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {deliverShipment.isPending ? '處理中...' : '標記送達'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelShipment.isPending}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {cancelShipment.isPending ? '取消中...' : '取消出貨'}
                </button>
              </>
            )}

            {shipment.status === 'delivered' && (
              <button
                onClick={handleCreateInvoice}
                disabled={createInvoice.isPending}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {createInvoice.isPending ? '建立中...' : '建立發票'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* 出貨資訊 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-600" />
            出貨資訊
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">出貨日期</span>
              <span className="text-slate-800">{shipment.shipped_date || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">預計送達</span>
              <span className="text-slate-800">{shipment.expected_delivery || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">實際送達</span>
              <span className="text-slate-800">{shipment.actual_delivery || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">物流公司</span>
              <span className="text-slate-800">{shipment.carrier || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">追蹤號碼</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-800">{shipment.tracking_number || '-'}</span>
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
          </div>
        </div>

        {/* 收件資訊 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            收件資訊
          </h3>
          <div className="space-y-3 text-sm">
            {shipment.recipient_name && (
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-slate-400 mt-0.5" />
                <span className="text-slate-800">{shipment.recipient_name}</span>
              </div>
            )}
            {shipment.recipient_phone && (
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                <span className="text-slate-800">{shipment.recipient_phone}</span>
              </div>
            )}
            {shipment.shipping_address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                <span className="text-slate-800 whitespace-pre-line">{shipment.shipping_address}</span>
              </div>
            )}
            {!shipment.recipient_name && !shipment.recipient_phone && !shipment.shipping_address && (
              <p className="text-slate-400">尚未填寫收件資訊</p>
            )}
          </div>
        </div>
      </div>

      {/* 關聯訂單 */}
      {shipment.order && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            關聯訂單
          </h3>
          <Link
            href={`/orders/${shipment.order.id}`}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
          >
            {shipment.order.order_number}
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* 出貨明細 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">出貨明細</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  品項
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  出貨數量
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  單價
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  小計
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {shipment.items && shipment.items.length > 0 ? (
                shipment.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-800">
                          {item.product_name?.zh || item.product_name?.en || item.description || '-'}
                        </p>
                        {item.sku && (
                          <p className="text-xs text-slate-500">SKU: {item.sku}</p>
                        )}
                        {item.description && item.product_name && (
                          <p className="text-sm text-slate-500">{item.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-800">
                      {item.quantity_shipped} {item.unit || ''}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-800">
                      {formatCurrency(item.unit_price, shipment.currency as Currency)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-800">
                      {formatCurrency(item.amount, shipment.currency as Currency)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    無出貨項目
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 金額摘要 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">小計</span>
            <span className="text-slate-800">
              {formatCurrency(shipment.subtotal, shipment.currency as Currency)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">運費</span>
            <span className="text-slate-800">
              {formatCurrency(shipment.shipping_fee, shipment.currency as Currency)}
            </span>
          </div>
          <div className="pt-3 border-t border-slate-200 flex justify-between">
            <span className="font-semibold text-slate-800">總金額</span>
            <span className="text-xl font-bold text-emerald-600">
              {formatCurrency(shipment.total_amount, shipment.currency as Currency)}
            </span>
          </div>
        </div>
      </div>

      {/* 備註 */}
      {(shipment.notes || shipment.internal_notes) && (
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">備註</h3>
          {shipment.notes && (
            <div className="mb-4">
              <p className="text-sm text-slate-500 mb-1">外部備註</p>
              <p className="text-slate-700 whitespace-pre-line">{shipment.notes}</p>
            </div>
          )}
          {shipment.internal_notes && (
            <div>
              <p className="text-sm text-slate-500 mb-1">內部備註</p>
              <p className="text-slate-700 whitespace-pre-line">{shipment.internal_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
