'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import FormInput from '@/components/ui/FormInput'
import { Combobox } from '@headlessui/react'

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

// 備註常用模版
const NOTE_TEMPLATES = {
  zh: {
    standard: '本報價單有效期限為 7 天。\n付款條件：簽約後 30 天內付清。\n交貨時間：收到訂單後 14 個工作天。',
    urgent: '本報價單有效期限為 3 天。\n付款條件：簽約後 7 天內付清。\n交貨時間：收到訂單後 7 個工作天（加急處理）。',
    wholesale: '本報價單有效期限為 14 天。\n付款條件：30% 訂金，尾款於交貨前付清。\n交貨時間：收到訂金後 21 個工作天。\n批發訂單享有特別折扣。',
    maintenance: '本報價為年度維護服務報價。\n付款條件：簽約後 30 天內付清。\n服務期間：簽約日起算一年。\n包含：定期檢查、故障排除、技術支援。',
  },
  en: {
    standard: 'This quotation is valid for 7 days.\nPayment terms: Full payment within 30 days after contract signing.\nDelivery time: 14 working days after receiving the order.',
    urgent: 'This quotation is valid for 3 days.\nPayment terms: Full payment within 7 days after contract signing.\nDelivery time: 7 working days after receiving the order (expedited processing).',
    wholesale: 'This quotation is valid for 14 days.\nPayment terms: 30% deposit, balance before delivery.\nDelivery time: 21 working days after receiving the deposit.\nWholesale orders enjoy special discounts.',
    maintenance: 'This quotation is for annual maintenance service.\nPayment terms: Full payment within 30 days after contract signing.\nService period: One year from the contract date.\nIncludes: Regular inspection, troubleshooting, technical support.',
  },
}

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
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({})
  const [customerQuery, setCustomerQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [productQueries, setProductQueries] = useState<Record<number, string>>({})
  const [selectedProducts, setSelectedProducts] = useState<Record<number, Product | null>>({})
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [customTemplates, setCustomTemplates] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    customerId: quotation?.customer_id || '',
    issueDate: quotation?.issue_date || new Date().toISOString().split('T')[0],
    validUntil: quotation?.valid_until || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: quotation?.currency || 'TWD',
    taxRate: quotation?.tax_rate?.toString() || '5',
    notes: quotation?.notes || '',
  })

  const [items, setItems] = useState<QuotationItem[]>(quotation?.items || [])

  // 載入自訂模版
  useEffect(() => {
    const templates = JSON.parse(localStorage.getItem('customNoteTemplates') || '{}')
    setCustomTemplates(templates)
  }, [])

  // 初始化已選客戶
  useEffect(() => {
    if (quotation?.customer_id && customers.length > 0) {
      const customer = customers.find(c => c.id === quotation.customer_id)
      setSelectedCustomer(customer || null)
    }
  }, [quotation?.customer_id, customers])

  // 過濾客戶列表
  const filteredCustomers = useMemo(() => {
    if (customerQuery === '') return customers
    const query = customerQuery.toLowerCase()
    return customers.filter(customer =>
      customer.name.zh.toLowerCase().includes(query) ||
      customer.name.en.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query)
    )
  }, [customers, customerQuery])

  // 過濾產品列表
  const getFilteredProducts = (index: number) => {
    const query = productQueries[index] || ''
    if (query === '') return products
    const queryLower = query.toLowerCase()
    return products.filter(product =>
      product.name?.zh?.toLowerCase().includes(queryLower) ||
      product.name?.en?.toLowerCase().includes(queryLower)
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
      setSelectedProducts({ ...selectedProducts, [index]: product })

      let convertedPrice = product.unit_price

      // 如果產品幣別與報價單幣別不同，進行匯率換算
      if (product.currency !== formData.currency) {
        // exchangeRates 是以報價單幣別(formData.currency)為基準的匯率
        // 例如：報價單是 TWD，exchangeRates = { TWD: 1, USD: 0.03265, EUR: 0.02794 }
        // 這表示：1 TWD = 0.03265 USD

        // 要將產品幣別轉換為報價單幣別，需要分兩步：
        // 1. 如果產品是 USD 100，報價單是 TWD
        //    換算：100 / 0.03265 = 3062.79 TWD ✓
        // 2. 如果產品是 EUR 50，報價單是 TWD
        //    換算：50 / 0.02794 = 1789.48 TWD ✓

        const rate = exchangeRates[product.currency]
        if (rate && rate !== 0) {
          convertedPrice = product.unit_price / rate
        } else {
          // 如果沒有對應的匯率，顯示警告並使用原價
          console.warn(`No exchange rate found for ${product.currency} to ${formData.currency}`)
        }
      }

      const newItems = [...items]
      newItems[index] = {
        ...newItems[index],
        product_id: productId,
        unit_price: convertedPrice,
      }
      // 重新計算小計
      const quantity = parseFloat(newItems[index].quantity.toString()) || 0
      const discount = parseFloat(newItems[index].discount.toString()) || 0
      newItems[index].subtotal = (quantity * convertedPrice) + discount
      setItems(newItems)
    }
  }

  const handleCurrencyChange = async (newCurrency: string) => {
    // 1. 更新表單幣別
    setFormData({ ...formData, currency: newCurrency })

    // 2. 獲取新幣別的匯率
    try {
      const response = await fetch(`/api/exchange-rates?base=${newCurrency}`)
      const data = await response.json()
      if (data.success) {
        setExchangeRates(data.rates)

        // 3. 重新計算所有產品的價格
        const updatedItems = items.map((item, index) => {
          if (!item.product_id) return item

          const product = selectedProducts[index] || products.find(p => p.id === item.product_id)
          if (!product) return item

          let convertedPrice = product.unit_price
          if (product.currency !== newCurrency) {
            const rate = data.rates[product.currency]
            if (rate && rate !== 0) {
              convertedPrice = product.unit_price / rate
            }
          }

          const quantity = parseFloat(item.quantity.toString()) || 0
          const discount = parseFloat(item.discount.toString()) || 0
          const subtotal = (quantity * convertedPrice) + discount

          return {
            ...item,
            unit_price: convertedPrice,
            subtotal
          }
        })

        setItems(updatedItems)
      }
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error)
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
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer"
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
          <Combobox
            value={selectedCustomer}
            onChange={(customer) => {
              setSelectedCustomer(customer)
              setFormData({ ...formData, customerId: customer?.id || '' })
            }}
          >
            <div className="relative">
              <Combobox.Input
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                displayValue={(customer: Customer | null) =>
                  customer ? `${customer.name[locale as 'zh' | 'en']} (${customer.email})` : ''
                }
                onChange={(event) => setCustomerQuery(event.target.value)}
                placeholder={t('quotation.selectCustomer')}
              />
              <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 shadow-lg border border-gray-300 focus:outline-none">
                {filteredCustomers.length === 0 && customerQuery !== '' ? (
                  <div className="px-3 py-2 text-sm text-gray-500">{t('common.noResults')}</div>
                ) : (
                  filteredCustomers.map((customer) => (
                    <Combobox.Option
                      key={customer.id}
                      value={customer}
                      className={({ active }) =>
                        `cursor-pointer select-none px-3 py-2 text-sm ${
                          active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                        }`
                      }
                    >
                      {customer.name[locale as 'zh' | 'en']} ({customer.email})
                    </Combobox.Option>
                  ))
                )}
              </Combobox.Options>
            </div>
          </Combobox>
          <button
            type="button"
            onClick={() => window.open(`/${locale}/customers/new`, '_blank')}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span>+</span>
            <span>{t('customer.createNew')}</span>
          </button>
        </div>

        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
            {t('quotation.currency')}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <select
            id="currency"
            value={formData.currency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
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
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-gray-900">{t('quotation.items')}</h3>
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
                  <Combobox
                    value={selectedProducts[index]}
                    onChange={(product) => {
                      setSelectedProducts({ ...selectedProducts, [index]: product })
                      if (product) {
                        handleProductChange(index, product.id)
                      }
                    }}
                  >
                    <div className="relative">
                      <Combobox.Input
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        displayValue={(product: Product | null) =>
                          product ? (product.name?.[locale as 'zh' | 'en'] || product.name?.zh || product.name?.en || 'Unknown Product') : ''
                        }
                        onChange={(event) => setProductQueries({ ...productQueries, [index]: event.target.value })}
                        placeholder={t('quotation.selectProduct')}
                      />
                      <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 shadow-lg border border-gray-300 focus:outline-none">
                        {getFilteredProducts(index).length === 0 && (productQueries[index] || '') !== '' ? (
                          <div className="px-3 py-2 text-sm text-gray-500">{t('common.noResults')}</div>
                        ) : (
                          getFilteredProducts(index).map((product) => (
                            <Combobox.Option
                              key={product.id}
                              value={product}
                              className={({ active }) =>
                                `cursor-pointer select-none px-3 py-2 text-sm ${
                                  active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                                }`
                              }
                            >
                              {product.name?.[locale as 'zh' | 'en'] || product.name?.zh || product.name?.en || 'Unknown Product'}
                            </Combobox.Option>
                          ))
                        )}
                      </Combobox.Options>
                    </div>
                  </Combobox>
                  <button
                    type="button"
                    onClick={() => window.open(`/${locale}/products/new`, '_blank')}
                    className="mt-1 text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>+</span>
                    <span>{t('product.createNew')}</span>
                  </button>
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

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('quotation.notes')}
          </label>
          <div className="flex gap-2">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  // 檢查是否為自訂模版
                  if (e.target.value.startsWith('custom:')) {
                    const templateKey = e.target.value.replace('custom:', '')
                    setFormData({ ...formData, notes: customTemplates[templateKey] })
                  } else {
                    const template = NOTE_TEMPLATES[locale as 'zh' | 'en'][e.target.value as keyof typeof NOTE_TEMPLATES.zh]
                    setFormData({ ...formData, notes: template })
                  }
                  setShowSaveTemplate(true)
                }
              }}
              className="text-sm px-2 py-1 border border-gray-300 rounded cursor-pointer hover:bg-gray-50"
            >
              <option value="">{t('quotation.selectTemplate')}</option>
              <option value="standard">{t('quotation.template.standard')}</option>
              <option value="urgent">{t('quotation.template.urgent')}</option>
              <option value="wholesale">{t('quotation.template.wholesale')}</option>
              <option value="maintenance">{t('quotation.template.maintenance')}</option>
              {Object.keys(customTemplates).length > 0 && (
                <>
                  <option disabled>──────────</option>
                  {Object.keys(customTemplates).map((key) => (
                    <option key={key} value={`custom:${key}`}>
                      {key} {locale === 'zh' ? '(自訂)' : '(Custom)'}
                    </option>
                  ))}
                </>
              )}
            </select>
            {showSaveTemplate && formData.notes && (
              <button
                type="button"
                onClick={() => {
                  const name = prompt(locale === 'zh' ? '請輸入模版名稱：' : 'Enter template name:')
                  if (name) {
                    // 儲存到 localStorage 作為自訂模版
                    const updatedTemplates = { ...customTemplates, [name]: formData.notes }
                    localStorage.setItem('customNoteTemplates', JSON.stringify(updatedTemplates))
                    setCustomTemplates(updatedTemplates)
                    alert(locale === 'zh' ? '模版已儲存！' : 'Template saved!')
                  }
                }}
                className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 cursor-pointer"
              >
                {locale === 'zh' ? '儲存為模版' : 'Save as Template'}
              </button>
            )}
          </div>
        </div>
        <textarea
          value={formData.notes}
          onChange={(e) => {
            setFormData({ ...formData, notes: e.target.value })
            setShowSaveTemplate(e.target.value !== '')
          }}
          placeholder={t('quotation.notesPlaceholder')}
          rows={3}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/quotations`)}
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
    </form>
  )
}
