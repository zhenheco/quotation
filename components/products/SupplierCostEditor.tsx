'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Trash2, Star, Plus } from 'lucide-react'
import {
  useProductSupplierCosts,
  useCreateSupplierCost,
  useDeleteSupplierCost,
  useSetPreferredSupplier,
  type CreateSupplierCostInput
} from '@/hooks/useProductSupplierCosts'

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
  const t = useTranslations('products')
  const [isAdding, setIsAdding] = useState(false)
  const [newSupplier, setNewSupplier] = useState<CreateSupplierCostInput>({
    supplier_name: '',
    supplier_code: '',
    cost_price: 0,
    cost_currency: 'TWD',
    is_preferred: false,
    notes: ''
  })

  const { data: supplierCosts = [], isLoading } = useProductSupplierCosts(productId)
  const createMutation = useCreateSupplierCost(productId || '')
  const deleteMutation = useDeleteSupplierCost(productId || '')
  const setPreferredMutation = useSetPreferredSupplier(productId || '')

  const handleAddSupplier = async () => {
    if (!productId || !newSupplier.supplier_name || newSupplier.cost_price <= 0) return

    try {
      await createMutation.mutateAsync(newSupplier)
      setNewSupplier({
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

  if (!productId) {
    return (
      <div className="text-sm text-gray-500">
        {t('saveProductFirst')}
      </div>
    )
  }

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading...</div>
  }

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
                <label className="text-xs text-gray-500">{t('supplierName')}</label>
                <div className="font-medium">{supplier.supplier_name}</div>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t('supplierCode')}</label>
                <div className="font-medium">{supplier.supplier_code || '-'}</div>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t('costPrice')}</label>
                <div className="font-medium">
                  {supplier.cost_currency} {supplier.cost_price.toLocaleString()}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t('profitMargin')}</label>
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
                  title={t('setPreferred')}
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
          {t('addSupplier')}
        </button>
      )}

      {canEdit && isAdding && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="new-supplier-name" className="block text-sm font-medium text-gray-700 mb-1">
                {t('supplierName')}
              </label>
              <input
                id="new-supplier-name"
                type="text"
                value={newSupplier.supplier_name}
                onChange={(e) => setNewSupplier({ ...newSupplier, supplier_name: e.target.value })}
                placeholder={t('supplierNamePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="new-supplier-code" className="block text-sm font-medium text-gray-700 mb-1">
                {t('supplierCode')}
              </label>
              <input
                id="new-supplier-code"
                type="text"
                value={newSupplier.supplier_code || ''}
                onChange={(e) => setNewSupplier({ ...newSupplier, supplier_code: e.target.value })}
                placeholder={t('supplierCodePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="new-cost-price" className="block text-sm font-medium text-gray-700 mb-1">
                {t('costPrice')}
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
                {t('costCurrency')}
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
              {t('setAsPreferred')}
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddSupplier}
              disabled={createMutation.isPending || !newSupplier.supplier_name || newSupplier.cost_price <= 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? t('adding') : t('add')}
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {supplierCosts.length === 0 && !isAdding && (
        <div className="text-sm text-gray-500 text-center py-4">
          {t('noSuppliers')}
        </div>
      )}
    </div>
  )
}
