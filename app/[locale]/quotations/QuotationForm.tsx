'use client'

import { useState } from 'react'
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

interface QuotationFormProps {
  locale: string
  customers: Customer[]
  products: Product[]
  quotation?: any
}

const CURRENCIES = ['TWD', 'USD', 'EUR', 'JPY', 'CNY']

export default function QuotationForm({
  locale,
  customers,
  products,
  quotation,
}: QuotationFormProps) {
  const t = useTranslations()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    customerId: quotation?.customer_id || '',
    issueDate: quotation?.issue_date || new Date().toISOString().split('T')[0],
    validUntil: quotation?.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: quotation?.currency || 'TWD',
    taxRate: quotation?.tax_rate?.toString() || '5',
    notes: quotation?.notes || '',
  })

  const [items, setItems] = useState<QuotationItem[]>(quotation?.items || [])

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
    newItems[index].subtotal = (quantity * unitPrice) - discount

    setItems(newItems)
  }

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (product) {
      updateItem(index, 'product_id', productId)
      updateItem(index, 'unit_price', product.unit_price)
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
      }

      let response

      if (quotation) {
        // Update existing quotation
        response = await fetch(`/api/quotations/${quotation.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(quotationData),
        })
      } else {
        // Create new quotation
        response = await fetch('/api/quotations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(quotationData),
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save quotation')
      }

      router.push(`/${locale}/quotations`)
      router.refresh()
    } catch (err) {
      console.error('Error saving quotation:', err)
      setError(err instanceof Error ? err.message : 'Failed to save quotation')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">{t('quotation.noCustomers')}</p>
        <button
          onClick={() => router.push(`/${locale}/customers/new`)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          {t('customer.createNew')}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-1">
            {t('quotation.customer')}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <select
            id="customerId"
            value={formData.customerId}
            onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
            required
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t('quotation.selectCustomer')}</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name[locale as 'zh' | 'en']} ({customer.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
            {t('quotation.currency')}
            <span className="text-red-500 ml-1">*</span>
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

      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label={t('quotation.issueDate')}
          name="issueDate"
          type="date"
          value={formData.issueDate}
          onChange={(value) => setFormData({ ...formData, issueDate: value })}
          required
        />

        <FormInput
          label={t('quotation.validUntil')}
          name="validUntil"
          type="date"
          value={formData.validUntil}
          onChange={(value) => setFormData({ ...formData, validUntil: value })}
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-gray-900">{t('quotation.items')}</h3>
          <button
            type="button"
            onClick={addItem}
            className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
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
                  <select
                    value={item.product_id}
                    onChange={(e) => handleProductChange(index, e.target.value)}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="">{t('quotation.selectProduct')}</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name[locale as 'zh' | 'en']}
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
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
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
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('quotation.discount')}
                  </label>
                  <input
                    type="number"
                    value={item.discount}
                    onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value))}
                    min="0"
                    step="0.01"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
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
                    className="ml-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
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
      </div>

      <div className="border-t pt-4">
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

      <FormInput
        label={t('quotation.notes')}
        name="notes"
        type="textarea"
        value={formData.notes}
        onChange={(value) => setFormData({ ...formData, notes: value })}
        placeholder={t('quotation.notesPlaceholder')}
        rows={3}
      />

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/quotations`)}
          disabled={isSubmitting}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  )
}
