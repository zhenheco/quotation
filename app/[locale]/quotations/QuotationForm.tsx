'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Combobox } from '@headlessui/react'
import {
  useCreateQuotation,
  useUpdateQuotation,
  useQuotation,
  type CreateQuotationItemInput,
  type BilingualText,
} from '@/hooks/useQuotations'
import { useCustomers, type Customer } from '@/hooks/useCustomers'
import { useProducts, type Product } from '@/hooks/useProducts'
import { toast } from 'sonner'

interface QuotationFormProps {
  locale: string
  quotationId?: string
}

const CURRENCIES = ['TWD', 'USD', 'EUR', 'JPY', 'CNY']

interface QuotationItem {
  product_id: string
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
}

export default function QuotationForm({ locale, quotationId }: QuotationFormProps) {
  const t = useTranslations()
  const router = useRouter()

  // Hooks
  const { data: customers = [], isLoading: loadingCustomers } = useCustomers()
  const { data: products = [], isLoading: loadingProducts } = useProducts()
  const { data: existingQuotation } = useQuotation(quotationId || '')
  const createQuotation = useCreateQuotation()
  const updateQuotation = useUpdateQuotation(quotationId || '')

  // 狀態
  const [customerQuery, setCustomerQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({
    customerId: '',
    issueDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'TWD',
    taxRate: '5',
    notes: '',
  })
  const [items, setItems] = useState<QuotationItem[]>([])
  const [error, setError] = useState('')

  // 初始化編輯模式
  useEffect(() => {
    if (existingQuotation) {
      setFormData({
        customerId: existingQuotation.customer_id,
        issueDate: existingQuotation.issue_date,
        validUntil: existingQuotation.valid_until,
        currency: existingQuotation.currency,
        taxRate: existingQuotation.tax_rate?.toString() || '5',
        notes: typeof existingQuotation.notes === 'string'
          ? existingQuotation.notes
          : (existingQuotation.notes as unknown as BilingualText)?.[locale as 'zh' | 'en'] || '',
      })

      // 設定已選客戶
      const customer = customers.find(c => c.id === existingQuotation.customer_id)
      if (customer) {
        setSelectedCustomer(customer)
      }
    }
  }, [existingQuotation, customers, locale])

  // 過濾客戶
  const filteredCustomers = customerQuery === ''
    ? customers
    : customers.filter((customer) => {
        const name = typeof customer.name === 'string'
          ? customer.name
          : (customer.name as unknown as BilingualText)[locale as 'zh' | 'en']
        return (
          name.toLowerCase().includes(customerQuery.toLowerCase()) ||
          customer.email?.toLowerCase().includes(customerQuery.toLowerCase())
        )
      })

  // 新增行項目
  const handleAddItem = () => {
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

  // 刪除行項目
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // 更新行項目
  const handleItemChange = (index: number, field: keyof QuotationItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // 自動計算小計
    if (field === 'quantity' || field === 'unit_price' || field === 'discount') {
      const item = newItems[index]
      const quantity = parseFloat(item.quantity.toString()) || 0
      const unitPrice = parseFloat(item.unit_price.toString()) || 0
      const discount = parseFloat(item.discount.toString()) || 0
      newItems[index].subtotal = quantity * unitPrice - discount
    }

    // 如果選擇產品，自動填入單價
    if (field === 'product_id') {
      const product = products.find(p => p.id === value)
      if (product && product.unit_price) {
        newItems[index].unit_price = product.unit_price
        const quantity = parseFloat(newItems[index].quantity.toString()) || 0
        const discount = parseFloat(newItems[index].discount.toString()) || 0
        newItems[index].subtotal = quantity * product.unit_price - discount
      }
    }

    setItems(newItems)
  }

  // 計算總計
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    const taxRate = parseFloat(formData.taxRate) || 0
    const taxAmount = (subtotal * taxRate) / 100
    const total = subtotal + taxAmount
    return { subtotal, taxAmount, total }
  }

  const { subtotal, taxAmount, total } = calculateTotals()

  // 提交表單
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      if (!formData.customerId) {
        throw new Error('請選擇客戶')
      }

      if (items.length === 0) {
        throw new Error('請至少新增一個項目')
      }

      const quotationData = {
        customer_id: formData.customerId,
        issue_date: formData.issueDate,
        valid_until: formData.validUntil,
        currency: formData.currency,
        subtotal,
        tax_rate: parseFloat(formData.taxRate),
        tax_amount: taxAmount,
        total,
        notes: formData.notes ? {
          zh: formData.notes,
          en: formData.notes,
        } as BilingualText : undefined,
        items: items.map((item) => {
          const product = products.find(p => p.id === item.product_id)
          const productName = product?.name as BilingualText | undefined
          return {
            product_id: item.product_id || undefined,
            description: {
              zh: productName?.zh || '',
              en: productName?.en || '',
            },
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount,
            amount: item.subtotal,
          } as CreateQuotationItemInput
        }),
      }

      if (quotationId) {
        await updateQuotation.mutateAsync(quotationData)
        toast.success('報價單已更新')
      } else {
        await createQuotation.mutateAsync(quotationData)
        toast.success('報價單已建立')
      }

      router.push(`/${locale}/quotations`)
    } catch (err) {
      console.error('Error saving quotation:', err)
      const errorMessage = err instanceof Error ? err.message : '儲存報價單失敗'
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }

  // 載入狀態
  if (loadingCustomers || loadingProducts) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // 無客戶狀態
  if (customers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">{t('quotation.noCustomers')}</p>
        <button
          onClick={() => router.push(`/${locale}/customers/new`)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer"
        >
          {t('customer.createNew')}
        </button>
      </div>
    )
  }

  const isSubmitting = createQuotation.isPending || updateQuotation.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* 基本資訊 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="customerId" className="block text-sm font-semibold text-gray-900 mb-1">
            {t('quotation.customer')}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <Combobox
            value={selectedCustomer}
            onChange={(customer) => {
              setSelectedCustomer(customer)
              setFormData({ ...formData, customerId: customer?.id || '' })
            }}
          >
            <div className="relative">
              <Combobox.Button as="div" className="relative">
                <Combobox.Input
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 cursor-pointer"
                  displayValue={(customer: Customer | null) => {
                    if (!customer) return ''
                    const name = typeof customer.name === 'string'
                      ? customer.name
                      : (customer.name as unknown as BilingualText)?.[locale as 'zh' | 'en'] || ''
                    return `${name} (${customer.email})`
                  }}
                  onChange={(event) => setCustomerQuery(event.target.value)}
                  placeholder={t('quotation.selectCustomer')}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </Combobox.Button>
              <Combobox.Options className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-lg bg-white py-1 shadow-lg border border-gray-300 focus:outline-none">
                {filteredCustomers.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">{t('common.noResults')}</div>
                ) : (
                  filteredCustomers.map((customer) => {
                    const name = typeof customer.name === 'string'
                      ? customer.name
                      : (customer.name as unknown as BilingualText)?.[locale as 'zh' | 'en'] || ''
                    return (
                      <Combobox.Option
                        key={customer.id}
                        value={customer}
                        className={({ active }) =>
                          `px-3 py-2 cursor-pointer ${
                            active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                          }`
                        }
                      >
                        {name} ({customer.email})
                      </Combobox.Option>
                    )
                  })
                )}
              </Combobox.Options>
            </div>
          </Combobox>
        </div>

        <div>
          <div>
            <label htmlFor="currency" className="block text-sm font-semibold text-gray-900 mb-1">
              {t('quotation.currency')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              id="currency"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              {CURRENCIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="issueDate" className="block text-sm font-semibold text-gray-900 mb-1">
            {t('quotation.issueDate')}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="date"
            id="issueDate"
            value={formData.issueDate}
            onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label htmlFor="validUntil" className="block text-sm font-semibold text-gray-900 mb-1">
            {t('quotation.validUntil')}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="date"
            id="validUntil"
            value={formData.validUntil}
            onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label htmlFor="taxRate" className="block text-sm font-semibold text-gray-900 mb-1">
            {t('quotation.taxRate')} (%)
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="number"
            id="taxRate"
            value={formData.taxRate}
            onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            min="0"
            max="100"
            step="0.01"
            required
          />
        </div>
      </div>

      {/* 行項目 */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">{t('quotation.items')}</h3>
          <button
            type="button"
            onClick={handleAddItem}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer"
          >
            {t('quotation.addItem')}
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-6 gap-4 items-start">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('quotation.product')}
                  </label>
                  <select
                    value={item.product_id}
                    onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">{t('quotation.selectProduct')}</option>
                    {products.map((product) => {
                      const name = typeof product.name === 'string'
                        ? product.name
                        : (product.name as unknown as BilingualText)?.[locale as 'zh' | 'en'] || ''
                      return (
                        <option key={product.id} value={product.id}>
                          {name} ({product.currency} {product.unit_price})
                        </option>
                      )
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('quotation.quantity')}
                  </label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                    step="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('quotation.unitPrice')}
                  </label>
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('quotation.discount')}
                  </label>
                  <input
                    type="number"
                    value={item.discount}
                    onChange={(e) => handleItemChange(index, 'discount', parseFloat(e.target.value) || 0)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="flex items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('quotation.subtotal')}
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                      {formData.currency} {item.subtotal.toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="ml-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {t('quotation.noItems')}
            </div>
          )}
        </div>
      </div>

      {/* 總計 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="max-w-md ml-auto space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t('quotation.subtotal')}:</span>
            <span className="text-gray-900 font-medium">
              {formData.currency} {subtotal.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              {t('quotation.tax')} ({formData.taxRate}%):
            </span>
            <span className="text-gray-900 font-medium">
              {formData.currency} {taxAmount.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>{t('quotation.total')}:</span>
            <span>{formData.currency} {total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 備註 */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          {t('quotation.notes')}
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={4}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder={t('quotation.notesPlaceholder')}
        />
      </div>

      {/* 提交按鈕 */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? t('common.saving') : quotationId ? t('common.update') : t('common.create')}
        </button>
      </div>
    </form>
  )
}
