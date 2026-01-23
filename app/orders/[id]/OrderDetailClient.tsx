'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package, Truck, CheckCircle, XCircle, Edit } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { getSelectedCompanyId } from '@/lib/utils/company-context'
import { parseNotes } from '@/lib/utils/notes-parser'
import {
  useOrder,
  useConfirmOrder,
  useCancelOrder,
  useDeleteOrder,
  type OrderStatus,
} from '@/hooks/useOrders'
import { useCreateShipmentFromOrder } from '@/hooks/useShipments'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/format'
import type { Currency } from '@/lib/services/exchange-rate'

// 狀態標籤樣式
const statusStyles: Record<OrderStatus, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-700', label: '草稿', icon: <Edit className="w-4 h-4" /> },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', label: '已確認', icon: <CheckCircle className="w-4 h-4" /> },
  shipped: { bg: 'bg-amber-100', text: 'text-amber-700', label: '已出貨', icon: <Truck className="w-4 h-4" /> },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '已完成', icon: <Package className="w-4 h-4" /> },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: '已取消', icon: <XCircle className="w-4 h-4" /> },
}

interface OrderDetailClientProps {
  orderId: string
}

export default function OrderDetailClient({ orderId }: OrderDetailClientProps) {
  const router = useRouter()
  const companyId = getSelectedCompanyId() || ''

  // Hooks
  const { data: order, isLoading, error } = useOrder(companyId, orderId)
  const confirmOrder = useConfirmOrder(companyId)
  const cancelOrder = useCancelOrder(companyId)
  const deleteOrder = useDeleteOrder(companyId)
  const createShipment = useCreateShipmentFromOrder()

  // 處理確認訂單
  const handleConfirm = async () => {
    try {
      await confirmOrder.mutateAsync(orderId)
      toast.success('訂單已確認')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '確認訂單失敗')
    }
  }

  // 處理取消訂單
  const handleCancel = async () => {
    if (!confirm('確定要取消此訂單嗎？')) return
    try {
      await cancelOrder.mutateAsync(orderId)
      toast.success('訂單已取消')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '取消訂單失敗')
    }
  }

  // 處理刪除訂單
  const handleDelete = async () => {
    if (!confirm('確定要刪除此訂單嗎？此操作無法復原。')) return
    try {
      await deleteOrder.mutateAsync(orderId)
      toast.success('訂單已刪除')
      router.push('/orders')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '刪除訂單失敗')
    }
  }

  // 處理建立出貨單
  const handleCreateShipment = async () => {
    try {
      const shipment = await createShipment.mutateAsync({ orderId })
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

  if (error || !order) {
    return (
      <div className="container mx-auto">
        <EmptyState
          icon="❌"
          title="找不到訂單"
          description={error?.message || '此訂單不存在或您沒有權限查看'}
          action={{
            label: '返回訂單列表',
            onClick: () => router.push('/orders'),
          }}
        />
      </div>
    )
  }

  const status = statusStyles[order.status]
  const customerName = order.customer?.name?.zh || order.customer?.name?.en || '未知客戶'

  return (
    <div className="container mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          返回訂單列表
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">{order.order_number}</h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.text}`}>
                {status.icon}
                {status.label}
              </span>
            </div>
            <p className="mt-1 text-slate-500">{customerName}</p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {order.status === 'draft' && (
              <>
                <button
                  onClick={() => router.push(`/orders/${orderId}/edit`)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  編輯
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={confirmOrder.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {confirmOrder.isPending ? '確認中...' : '確認訂單'}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteOrder.isPending}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleteOrder.isPending ? '刪除中...' : '刪除'}
                </button>
              </>
            )}

            {order.status === 'confirmed' && (
              <>
                <button
                  onClick={handleCreateShipment}
                  disabled={createShipment.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {createShipment.isPending ? '建立中...' : '建立出貨單'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelOrder.isPending}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  {cancelOrder.isPending ? '取消中...' : '取消訂單'}
                </button>
              </>
            )}

            {order.status === 'shipped' && (
              <button
                onClick={handleCancel}
                disabled={cancelOrder.isPending}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
              >
                {cancelOrder.isPending ? '取消中...' : '取消訂單'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Order Info Card */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">訂單資訊</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-slate-500 mb-1">訂單編號</p>
              <p className="font-medium text-slate-800">{order.order_number}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">訂單日期</p>
              <p className="font-medium text-slate-800">{order.order_date}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">預計交貨日期</p>
              <p className="font-medium text-slate-800">{order.expected_delivery_date || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">幣別</p>
              <p className="font-medium text-slate-800">{order.currency}</p>
            </div>
            {order.quotation && (
              <div>
                <p className="text-sm text-slate-500 mb-1">來源報價單</p>
                <Link
                  href={`/quotations/${order.quotation.id}`}
                  className="font-medium text-blue-600 hover:text-blue-700"
                >
                  {order.quotation.quotation_number}
                </Link>
              </div>
            )}
          </div>

          {/* 地址資訊 */}
          {(order.shipping_address || order.billing_address) && (
            <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
              {order.shipping_address && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">送貨地址</p>
                  <p className="font-medium text-slate-800 whitespace-pre-line">{order.shipping_address}</p>
                </div>
              )}
              {order.billing_address && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">帳單地址</p>
                  <p className="font-medium text-slate-800 whitespace-pre-line">{order.billing_address}</p>
                </div>
              )}
            </div>
          )}

          {/* 備註 */}
          {(order.notes || order.terms) && (
            <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
              {order.notes && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">備註</p>
                  <p className="text-slate-800 whitespace-pre-line">{parseNotes(order.notes)}</p>
                </div>
              )}
              {order.terms && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">條款</p>
                  <p className="text-slate-800 whitespace-pre-line">{parseNotes(order.terms)}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Customer Info Card */}
      {order.customer && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">客戶資訊</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-500 mb-1">客戶名稱</p>
                <p className="font-medium text-slate-800">{customerName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Email</p>
                <p className="font-medium text-slate-800">{order.customer.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">電話</p>
                <p className="font-medium text-slate-800">{order.customer.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">統編</p>
                <p className="font-medium text-slate-800">{order.customer.tax_id || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">訂單明細</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  商品
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  數量
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  單價
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  折扣
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  小計
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  已出貨
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items?.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-slate-800">
                        {parseNotes(item.product_name) || item.description || '-'}
                      </p>
                      {item.sku && (
                        <p className="text-sm text-slate-500">SKU: {item.sku}</p>
                      )}
                      {item.description && item.product_name && (
                        <p className="text-sm text-slate-500">{item.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-800">
                    {item.quantity} {item.unit || ''}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-800">
                    {formatCurrency(item.unit_price, order.currency as Currency)}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-800">
                    {item.discount > 0 ? formatCurrency(item.discount, order.currency as Currency) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-800">
                    {formatCurrency(item.amount, order.currency as Currency)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={item.quantity_remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                      {item.quantity_shipped} / {item.quantity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <div className="max-w-xs ml-auto space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">小計</span>
              <span className="text-slate-800">{formatCurrency(order.subtotal, order.currency as Currency)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  折扣 {order.discount_description ? `(${order.discount_description})` : ''}
                </span>
                <span className="text-red-600">-{formatCurrency(order.discount_amount, order.currency as Currency)}</span>
              </div>
            )}
            {order.show_tax && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">稅額 ({order.tax_rate}%)</span>
                <span className="text-slate-800">{formatCurrency(order.tax_amount, order.currency as Currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200">
              <span className="text-slate-800">總計</span>
              <span className="text-emerald-600">{formatCurrency(order.total_amount, order.currency as Currency)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
