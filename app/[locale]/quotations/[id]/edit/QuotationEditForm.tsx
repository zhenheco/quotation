'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import FormInput from '@/components/ui/FormInput'

interface Customer {
  id: string
  name: { zh: string; en: string }
  email: string
}

interface Product {
  id: string
  name: { zh: string; en: string }
  unit_price: number
  currency: string
}

interface QuotationItem {
  product_id: string
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
}

interface Version {
  id: string
  quotation_id: string
  version_number: number
  changes: any
  changed_by: string
  created_at: string
}

interface QuotationEditFormProps {
  locale: string
  quotation: any
  customers: Customer[]
  products: Product[]
  versions: Version[]
}

const CURRENCIES = ['TWD', 'USD', 'EUR', 'JPY', 'CNY']
const STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired']

export default function QuotationEditForm({
  locale,
  quotation,
  customers,
  products,
  versions,
}: QuotationEditFormProps) {
  const t = useTranslations()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({})
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [productSearches, setProductSearches] = useState<Record<number, string>>({})

  const [formData, setFormData] = useState({
    customerId: quotation.customer_id,
    issueDate: quotation.issue_date,
    validUntil: quotation.valid_until,
    currency: quotation.currency,
    taxRate: quotation.tax_rate?.toString() || '5',
    notes: quotation.notes || '',
    status: quotation.status,
  })

  const [items, setItems] = useState<QuotationItem[]>(
    quotation.items?.map((item: any) => ({
      product_id: item.product_id || '',
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount,
      subtotal: item.amount,
    })) || []
  )

  // 過濾產品列表
  const getFilteredProducts = (index: number) => {
    const search = productSearches[index]
    if (!search) return products
    const searchLower = search.toLowerCase()
    return products.filter(product =>
      product.name?.zh?.toLowerCase().includes(searchLower) ||
      product.name?.en?.toLowerCase().includes(searchLower)
    )
  }

  // 獲取匯率數據
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        const response = await fetch(`/api/exchange-rates?base=${formData.currency}`)
        const data = await response.json()
        if (data.success) {
          setExchangeRates(data.rates)
        }
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error)
      }
    }
    fetchExchangeRates()
  }, [formData.currency])

  const addItem = () => {
    setItems([
      ...items,
      {
        product_id: '',
        quantity: 1,
        unit_price: 0,
        discount: 0,
        subtotal: 0,
      },
    ])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof QuotationItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Recalculate subtotal
    const quantity = parseFloat(newItems[index].quantity.toString()) || 0
    const unitPrice = parseFloat(newItems[index].unit_price.toString()) || 0
    const discount = parseFloat(newItems[index].discount.toString()) || 0
    // 折扣為負數，所以直接相加
    newItems[index].subtotal = (quantity * unitPrice) + discount

    setItems(newItems)
  }

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (product) {
      let convertedPrice = product.unit_price

      // 如果產品幣別與報價單幣別不同，進行匯率換算
      if (product.currency !== formData.currency) {
        // exchangeRates 是以報價單幣別(formData.currency)為基準的匯率
        // 例如：報價單是 TWD，exchangeRates = { TWD: 1, USD: 0.03265, EUR: 0.02794 }
        // 這表示：1 TWD = 0.03265 USD

        // 要將產品幣別轉換為報價單幣別：
        // 例如：產品是 USD 100，報價單是 TWD
        // 換算：100 / 0.03265 = 3062.79 TWD

        const rate = exchangeRates[product.currency]
        if (rate && rate !== 0) {
          convertedPrice = product.unit_price / rate
        } else {
          // 如果沒有對應的匯率，顯示警告並使用原價
          console.warn(`No exchange rate found for ${product.currency} to ${formData.currency}`)
        }
      }

      updateItem(index, 'product_id', productId)
      updateItem(index, 'unit_price', convertedPrice)
    }
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    const taxRate = parseFloat(formData.taxRate) || 0
    const taxAmount = (subtotal * taxRate) / 100
    const total = subtotal + taxAmount
    return { subtotal, taxAmount, total }
  }

  const { subtotal, taxAmount, total } = calculateTotals()

  // 記錄變更
  const getChanges = () => {
    const changes: any = {}

    if (formData.validUntil !== quotation.valid_until) {
      changes.valid_until = {
        from: quotation.valid_until,
        to: formData.validUntil
      }
    }

    if (formData.currency !== quotation.currency) {
      changes.currency = {
        from: quotation.currency,
        to: formData.currency
      }
    }

    if (formData.status !== quotation.status) {
      changes.status = {
        from: quotation.status,
        to: formData.status
      }
    }

    if (JSON.stringify(items) !== JSON.stringify(quotation.items)) {
      changes.items = 'modified'
    }

    return changes
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      if (!formData.customerId) {
        throw new Error('Please select a customer')
      }

      if (items.length === 0) {
        throw new Error('Please add at least one item')
      }

      const quotationData = {
        customer_id: formData.customerId,
        issue_date: formData.issueDate,
        valid_until: formData.validUntil,
        currency: formData.currency,
        status: formData.status,
        subtotal,
        tax_rate: parseFloat(formData.taxRate),
        tax_amount: taxAmount,
        total_amount: total,
        notes: formData.notes || null,
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
          subtotal: item.subtotal,
        })),
        changes: getChanges(), // 記錄變更
      }

      const response = await fetch(`/api/quotations/${quotation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quotationData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update quotation')
      }

      router.push(`/${locale}/quotations/${quotation.id}`)
      router.refresh()
    } catch (err) {
      console.error('Error updating quotation:', err)
      setError(err instanceof Error ? err.message : 'Failed to update quotation')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('quotation.basicInfo')}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('quotation.customer')}
              </label>
              <div className="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                {quotation.customers?.name[locale as 'zh' | 'en']} ({quotation.customers?.email})
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('quotation.status')}
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(`status.${status}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('quotation.issueDate')}
              </label>
              <div className="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                {locale === 'zh'
                  ? new Date(formData.issueDate).toLocaleDateString('zh-TW', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : new Date(formData.issueDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
              </div>
            </div>

            <FormInput
              label={t('quotation.validUntil')}
              name="validUntil"
              type="date"
              value={formData.validUntil}
              onChange={(value) => setFormData({ ...formData, validUntil: value })}
              required
            />

            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                {t('quotation.currency')}
              </label>
              <select
                id="currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {t(`currency.${currency}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('quotation.items')}
            </h2>
            <button
              type="button"
              onClick={addItem}
              className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 cursor-pointer"
            >
              {t('quotation.addItem')}
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-6 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('product.name')}
                    </label>
                    <input
                      type="text"
                      placeholder={t('common.search')}
                      value={productSearches[index] || ''}
                      onChange={(e) => setProductSearches({ ...productSearches, [index]: e.target.value })}
                      className="block w-full px-3 py-2 mb-1 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                    />
                    <select
                      value={item.product_id}
                      onChange={(e) => handleProductChange(index, e.target.value)}
                      required
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="">{t('quotation.selectProduct')}</option>
                      {getFilteredProducts(index).map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name?.[locale as 'zh' | 'en'] || product.name?.zh || product.name?.en || 'Unknown Product'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('quotation.quantity')}
                    </label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                      min="1"
                      required
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('quotation.unitPrice')}
                    </label>
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                      min="0"
                      step="0.01"
                      required
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('quotation.discount')}
                    </label>
                    <input
                      type="number"
                      value={item.discount}
                      onChange={(e) => {
                        let value = parseFloat(e.target.value) || 0
                        // 確保折扣為負數
                        if (value > 0) value = -value
                        updateItem(index, 'discount', value)
                      }}
                      max="0"
                      step="0.01"
                      placeholder="-100.00"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  <div className="flex items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('quotation.subtotal')}
                      </label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm">
                        {item.subtotal.toFixed(2)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="ml-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
              {t('quotation.noItems')}
            </div>
          )}

          <div className="border-t pt-4 mt-4">
            <div className="max-w-md ml-auto space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">{t('quotation.subtotal')}:</span>
                <span className="font-medium">{formData.currency} {subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">{t('quotation.tax')}:</span>
                  <input
                    type="number"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-gray-700">%</span>
                </div>
                <span className="font-medium">{formData.currency} {taxAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>{t('quotation.total')}:</span>
                <span>{formData.currency} {total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <FormInput
            label={t('quotation.notes')}
            name="notes"
            type="textarea"
            value={formData.notes}
            onChange={(value) => setFormData({ ...formData, notes: value })}
            placeholder={t('quotation.notesPlaceholder')}
            rows={3}
          />
        </div>

        <div className="flex justify-between items-center gap-4">
          <button
            type="button"
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {showVersionHistory ? t('quotation.hideHistory') : t('quotation.showHistory')}
          </button>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push(`/${locale}/quotations/${quotation.id}`)}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      </form>

      {showVersionHistory && (
        <div className="mt-6 bg-white shadow-md rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('quotation.versionHistory')}
          </h2>
          {versions.length > 0 ? (
            <div className="space-y-3">
              {versions.map((version) => (
                <div key={version.id} className="border-l-4 border-indigo-500 pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {t('quotation.version')} {version.version_number}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(version.created_at).toLocaleString(locale === 'zh' ? 'zh-TW' : 'en-US')}
                      </p>
                      {version.changes && (
                        <div className="mt-2 text-sm text-gray-700">
                          <pre className="bg-gray-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(version.changes, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">{t('quotation.noVersionHistory')}</p>
          )}
        </div>
      )}
    </div>
  )
}
