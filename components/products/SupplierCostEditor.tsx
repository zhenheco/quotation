'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trash2, Star, Plus, ExternalLink } from 'lucide-react'
import {
  useProductSupplierCosts,
  useCreateSupplierCost,
  useDeleteSupplierCost,
  useSetPreferredSupplier,
  type CreateSupplierCostInput
} from '@/hooks/useProductSupplierCosts'
import { useSupplierOptions } from '@/hooks/useSuppliers'
import { getSelectedCompanyId } from '@/lib/utils/company-context'

interface SupplierCostEditorProps {
  productId: string | undefined
  canEdit: boolean
  basePrice?: number
  baseCurrency?: string
}

const CURRENCIES = ['TWD', 'USD', 'EUR', 'JPY', 'CNY', 'GBP']

export function SupplierCostEditor({
  productId,
  canEdit,
  basePrice,
  baseCurrency
}: SupplierCostEditorProps) {
  // 固定使用繁體中文
  const locale = 'zh'

  const [isAdding, setIsAdding] = useState(false)
  const [newSupplier, setNewSupplier] = useState<CreateSupplierCostInput>({
    supplier_id: '',
    supplier_name: '',
    supplier_code: '',
    cost_price: 0,
    cost_currency: 'TWD',
    is_preferred: false,
    notes: ''
  })

  const companyId = getSelectedCompanyId()
  const { data: supplierCosts = [], isLoading } = useProductSupplierCosts(productId)
  const { options: supplierOptions, isLoading: isLoadingSuppliers } = useSupplierOptions(companyId || undefined, locale)
  const createMutation = useCreateSupplierCost(productId || '')
  const deleteMutation = useDeleteSupplierCost(productId || '')
  const setPreferredMutation = useSetPreferredSupplier(productId || '')

  // 當選擇供應商時，自動填入名稱和代碼
  const handleSupplierSelect = (supplierId: string) => {
    const selectedOption = supplierOptions.find(opt => opt.value === supplierId)
    if (selectedOption) {
      setNewSupplier({
        ...newSupplier,
        supplier_id: supplierId,
        supplier_name: selectedOption.label,
        supplier_code: selectedOption.code || ''
      })
    } else {
      setNewSupplier({
        ...newSupplier,
        supplier_id: '',
        supplier_name: '',
        supplier_code: ''
      })
    }
  }

  const handleAddSupplier = async () => {
    if (!productId || !newSupplier.supplier_id || newSupplier.cost_price <= 0) return

    try {
      await createMutation.mutateAsync(newSupplier)
      setNewSupplier({
        supplier_id: '',
        supplier_name: '',
        supplier_code: '',
        cost_price: 0,
        cost_currency: 'TWD',
        is_preferred: false,
        notes: ''
      })
      setIsAdding(false)
    } catch (error) {
      console.error('Failed to add supplier:', error)
    }
  }

  const handleDeleteSupplier = async (id: string) => {
    if (!productId) return
    try {
      await deleteMutation.mutateAsync(id)
    } catch (error) {
      console.error('Failed to delete supplier:', error)
    }
  }

  const handleSetPreferred = async (id: string) => {
    if (!productId) return
    try {
      await setPreferredMutation.mutateAsync(id)
    } catch (error) {
      console.error('Failed to set preferred supplier:', error)
    }
  }

  const calculateProfitMargin = (costPrice: number, costCurrency: string) => {
    if (!basePrice || basePrice <= 0 || costPrice <= 0) return null
    if (costCurrency !== baseCurrency) return null
    return ((basePrice - costPrice) / costPrice * 100).toFixed(2)
  }

  // 取得供應商顯示名稱
  const getSupplierDisplayName = (supplierCost: { supplier_id: string | null; supplier_name: string; supplier?: { name: { zh: string; en: string } } | null }) => {
    // 優先使用關聯的供應商名稱
    if (supplierCost.supplier?.name) {
      return supplierCost.supplier.name.zh
    }
    // 否則使用儲存的供應商名稱
    return supplierCost.supplier_name
  }

  if (!productId) {
    return (
      <div className="text-sm text-gray-500">
        請先儲存產品
      </div>
    )
  }

  if (isLoading) {
    return <div className="text-sm text-gray-500">載入中...</div>
  }

  // 過濾已經新增的供應商
  const usedSupplierIds = supplierCosts.map(sc => sc.supplier_id).filter(Boolean)
  const availableSuppliers = supplierOptions.filter(opt => !usedSupplierIds.includes(opt.value))

  return (
    <div className="space-y-4">
      {supplierCosts.map((supplier) => (
        <div
          key={supplier.id}
          className={`border rounded-lg p-4 ${supplier.is_preferred ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200'}`}
        >
          <div className="flex items-start gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-gray-500">供應商名稱</label>
                <div className="font-medium">{getSupplierDisplayName(supplier)}</div>
              </div>
              <div>
                <label className="text-xs text-gray-500">供應商代碼</label>
                <div className="font-medium">{supplier.supplier_code || supplier.supplier?.code || '-'}</div>
              </div>
              <div>
                <label className="text-xs text-gray-500">成本價</label>
                <div className="font-medium">
                  {supplier.cost_currency} {supplier.cost_price.toLocaleString()}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">利潤率</label>
                <div className="font-medium">
                  {calculateProfitMargin(supplier.cost_price, supplier.cost_currency)
                    ? `${calculateProfitMargin(supplier.cost_price, supplier.cost_currency)}%`
                    : '-'}
                </div>
              </div>
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSetPreferred(supplier.id)}
                  disabled={supplier.is_preferred || setPreferredMutation.isPending}
                  className={`p-2 rounded-lg transition-colors ${
                    supplier.is_preferred
                      ? 'bg-yellow-500 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title="設為首選"
                >
                  <Star className={`h-4 w-4 ${supplier.is_preferred ? 'fill-current' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSupplier(supplier.id)}
                  disabled={deleteMutation.isPending}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {canEdit && !isAdding && (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          新增供應商
        </button>
      )}

      {canEdit && isAdding && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 供應商選擇下拉選單 */}
            <div className="md:col-span-2">
              <label htmlFor="new-supplier-select" className="block text-sm font-medium text-gray-700 mb-1">
                選擇供應商
              </label>
              <div className="flex gap-2">
                <select
                  id="new-supplier-select"
                  value={newSupplier.supplier_id || ''}
                  onChange={(e) => handleSupplierSelect(e.target.value)}
                  disabled={isLoadingSuppliers}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">請選擇供應商</option>
                  {availableSuppliers.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} {option.code ? `(${option.code})` : ''}
                    </option>
                  ))}
                </select>
                <Link
                  href="/suppliers/new"
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors whitespace-nowrap"
                  title="建立新供應商"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">新增</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              {availableSuppliers.length === 0 && !isLoadingSuppliers && (
                <p className="mt-1 text-sm text-gray-500">
                  {supplierOptions.length === 0
                    ? '尚無可用供應商'
                    : '所有供應商皆已新增'
                  }
                </p>
              )}
            </div>

            {/* 顯示選中的供應商資訊（唯讀） */}
            {newSupplier.supplier_id && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    供應商名稱
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                    {newSupplier.supplier_name || '-'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    供應商代碼
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                    {newSupplier.supplier_code || '-'}
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="new-cost-price" className="block text-sm font-medium text-gray-700 mb-1">
                成本價
              </label>
              <input
                id="new-cost-price"
                type="number"
                step="0.01"
                min="0"
                value={newSupplier.cost_price || ''}
                onChange={(e) => setNewSupplier({ ...newSupplier, cost_price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="new-cost-currency" className="block text-sm font-medium text-gray-700 mb-1">
                成本幣別
              </label>
              <select
                id="new-cost-currency"
                value={newSupplier.cost_currency}
                onChange={(e) => setNewSupplier({ ...newSupplier, cost_currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="new-is-preferred"
              checked={newSupplier.is_preferred}
              onChange={(e) => setNewSupplier({ ...newSupplier, is_preferred: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="new-is-preferred" className="text-sm text-gray-700">
              設為首選供應商
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddSupplier}
              disabled={createMutation.isPending || !newSupplier.supplier_id || newSupplier.cost_price <= 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? '新增中...' : '新增'}
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {supplierCosts.length === 0 && !isAdding && (
        <div className="text-sm text-gray-500 text-center py-4">
          尚無供應商
        </div>
      )}
    </div>
  )
}
