'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import FormInput from '@/components/ui/FormInput'
import { formatPrice } from '@/lib/utils/format'

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

interface VersionChanges {
  [key: string]: {
    from: string | number
    to: string | number
  } | string
}

interface Version {
  id: string
  quotation_id: string
  version_number: number
  changes: VersionChanges
  changed_by: string
  created_at: string
}

interface Quotation {
  id: string
  customer_id: string
  issue_date: string
  valid_until: string
  currency: string
  status: string
  tax_rate?: number
  notes?: string
  contract_file_url?: string
  contract_file_name?: string
  items?: Array<{
    product_id?: string
    quantity: number
    unit_price: number
    discount: number
    amount: number
  }>
  customers?: {
    name: { zh: string; en: string }
    email: string
  }
  customer?: {
    name: { zh: string; en: string }
    email: string
  }
}

interface QuotationEditFormProps {
  locale: string
  quotation: Quotation
  customers: Customer[]
  products: Product[]
  versions: Version[]
}

const CURRENCIES = ['TWD', 'USD', 'EUR', 'JPY', 'CNY']
const STATUSES = ['draft', 'sent', 'signed', 'expired']

export default function QuotationEditForm({
  locale,
  quotation,
  products,
  versions,
}: QuotationEditFormProps) {
  const t = useTranslations()
  const currentLocale = useLocale() as 'zh' | 'en'
  const router = useRouter()
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({})
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [contractFileUrl, setContractFileUrl] = useState<string>('')

  // 日期格式轉換函數
  const formatDateForInput = (dateValue: string | Date): string => {
    if (!dateValue) return ''
    const dateStr = dateValue instanceof Date ? dateValue.toISOString() : dateValue
    return dateStr.split('T')[0]
  }

  const [formData, setFormData] = useState({
    customerId: quotation.customer_id,
    issueDate: formatDateForInput(quotation.issue_date),
    validUntil: formatDateForInput(quotation.valid_until),
    currency: quotation.currency,
    taxRate: quotation.tax_rate?.toString() || '5',
    notes: quotation.notes || '',
    status: quotation.status,
  })

  const [items, setItems] = useState<QuotationItem[]>(
    quotation.items?.map((item) => ({
      product_id: item.product_id || '',
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount,
      subtotal: item.amount,
    })) || []
  )

  useEffect(() => {
    if (quotation.contract_file_url) {
      setContractFileUrl(quotation.contract_file_url)
    }
  }, [quotation])


  // 獲取匯率數據
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        const response = await fetch(`/api/exchange-rates?base=${formData.currency}`)
        const data: { success?: boolean; rates?: Record<string, number> } = await response.json()
        if (data.success && data.rates) {
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

  const updateItem = (index: number, field: keyof QuotationItem, value: string | number) => {
    const newItems = [...items]

    let finalValue: number = 0
    if (field === 'product_id') {
      finalValue = typeof value === 'string' ? parseInt(value, 10) : (value as number)
    } else {
      const numValue = typeof value === 'string' ? parseFloat(value) : value
      const isValid = typeof numValue === 'number' && !isNaN(numValue) && numValue >= 0
      finalValue = isValid ? numValue : (field === 'quantity' ? 1 : 0)
    }

    newItems[index] = { ...newItems[index], [field]: finalValue }

    const quantity = typeof newItems[index].quantity === 'number' && !isNaN(newItems[index].quantity) && newItems[index].quantity > 0
      ? newItems[index].quantity
      : 1
    const unitPrice = typeof newItems[index].unit_price === 'number' && !isNaN(newItems[index].unit_price) && newItems[index].unit_price >= 0
      ? newItems[index].unit_price
      : 0
    const discount = typeof newItems[index].discount === 'number' && !isNaN(newItems[index].discount)
      ? newItems[index].discount
      : 0

    newItems[index].subtotal = Math.max(0, (quantity * unitPrice) + discount)

    setItems(newItems)
  }

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (product) {
      let convertedPrice = product.unit_price

      // 如果產品幣別與報價單幣別不同，進行匯率換算
      if (product.currency && product.currency !== formData.currency) {
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

      const newItems = [...items]
      const currentItem = newItems[index]

      let quantity = 1
      if (typeof currentItem.quantity === 'number' && !isNaN(currentItem.quantity) && currentItem.quantity > 0) {
        quantity = currentItem.quantity
      }

      let discount = 0
      if (typeof currentItem.discount === 'number' && !isNaN(currentItem.discount)) {
        discount = currentItem.discount
      }

      const validPrice = typeof convertedPrice === 'number' && !isNaN(convertedPrice) && convertedPrice >= 0
        ? convertedPrice
        : 0

      newItems[index] = {
        product_id: productId,
        quantity: quantity,
        unit_price: validPrice,
        discount: discount,
        subtotal: Math.max(0, (quantity * validPrice) + discount)
      }

      setItems(newItems)
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

  const handleContractFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('檔案大小不能超過 10MB')
      return
    }

    setContractFile(file)
  }

  const uploadContractFile = async (quotationId: string): Promise<string | null> => {
    if (!contractFile) return null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('未登入')

      const timestamp = Date.now()
      const safeFileName = contractFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const fileName = `${timestamp}_${safeFileName}`
      const filePath = `${user.id}/${quotationId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('quotation-contracts')
        .upload(filePath, contractFile, {
          contentType: contractFile.type,
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('quotation-contracts')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('上傳合約失敗:', error)
      toast.error('上傳合約失敗')
      return null
    }
  }

  // 記錄變更
  const getChanges = (): VersionChanges => {
    const changes: VersionChanges = {}

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
        toast.error('請選擇客戶')
        return
      }

      if (items.length === 0 || items.some(item => !item.product_id)) {
        toast.error('請至少新增一個產品')
        return
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
        const errorData: { error?: string } = await response.json()
        throw new Error(errorData.error || 'Failed to update quotation')
      }

      if (contractFile) {
        const contractUrl = await uploadContractFile(quotation.id)
        if (contractUrl) {
          await fetch(`/api/quotations/${quotation.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contract_file_url: contractUrl,
              contract_file_name: contractFile?.name || null
            }),
          })
          toast.success('合約已上傳')
        }
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
                {quotation.customers?.name?.[locale as 'zh' | 'en'] || quotation.customer?.name?.[locale as 'zh' | 'en']} ({quotation.customers?.email || quotation.customer?.email})
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

          {/* 欄位標題 */}
          <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-gray-50 border-b-2 border-gray-200">
            <div className="flex-1 min-w-0 text-sm font-medium text-gray-700">
              {t('product.name')}
            </div>
            <div className="w-24 text-sm font-medium text-gray-700 text-center">
              {t('quotation.quantity')}
            </div>
            <div className="w-32 text-sm font-medium text-gray-700 text-right">
              {t('quotation.unitPrice')}
            </div>
            <div className="w-28 text-sm font-medium text-gray-700 text-right">
              {t('quotation.discount')}
            </div>
            <div className="w-32 text-sm font-medium text-gray-700 text-right">
              {t('quotation.subtotal')}
            </div>
            <div className="w-10"></div>
          </div>

          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors">
                {/* 產品選擇 */}
                <div className="flex-1 min-w-0">
                  <select
                    value={item.product_id || ''}
                    onChange={(e) => handleProductChange(index, e.target.value)}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="">{t('quotation.selectProduct')}</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name?.[locale as 'zh' | 'en'] || product.name?.zh || product.name?.en || 'Unknown Product'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 數量 */}
                <div className="w-24">
                  <input
                    type="number"
                    value={typeof item.quantity === 'number' && !isNaN(item.quantity) && item.quantity > 0 ? item.quantity : 1}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      updateItem(index, 'quantity', isNaN(val) || val <= 0 ? 1 : val)
                    }}
                    min="1"
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                {/* 單價 */}
                <div className="w-32">
                  <input
                    type="number"
                    value={typeof item.unit_price === 'number' && !isNaN(item.unit_price) && item.unit_price >= 0 ? item.unit_price : 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      updateItem(index, 'unit_price', isNaN(val) || val < 0 ? 0 : val)
                    }}
                    min="0"
                    step={currentLocale === 'zh' ? '1' : '0.01'}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                {/* 折扣 */}
                <div className="w-28">
                  <input
                    type="number"
                    value={typeof item.discount === 'number' && !isNaN(item.discount) ? item.discount : 0}
                    onChange={(e) => {
                      let value = parseFloat(e.target.value) || 0
                      if (value > 0) value = -value
                      updateItem(index, 'discount', value)
                    }}
                    max="0"
                    step={currentLocale === 'zh' ? '1' : '0.01'}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                {/* 小計 */}
                <div className="w-32 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-right font-medium">
                  {formatPrice(item.subtotal, currentLocale)}
                </div>

                {/* 刪除按鈕 */}
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="w-10 h-10 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                  title={t('common.delete')}
                >
                  ✕
                </button>
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
                <span className="font-medium">{formData.currency} {formatPrice(subtotal, currentLocale)}</span>
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
                    step={currentLocale === 'zh' ? '1' : '0.01'}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-gray-700">%</span>
                </div>
                <span className="font-medium">{formData.currency} {formatPrice(taxAmount, currentLocale)}</span>
              </div>

              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>{t('quotation.total')}:</span>
                <span>{formData.currency} {formatPrice(total, currentLocale)}</span>
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

        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            合約檔案
          </h2>
          <div>
            <label htmlFor="contract" className="block text-sm font-medium text-gray-700 mb-1">
              合約檔案
            </label>
            <div className="mt-1">
              {contractFileUrl && !contractFile && (
                <div className="mb-2 p-3 bg-gray-50 border border-gray-300 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm text-gray-700">
                      {quotation.contract_file_name || decodeURIComponent(contractFileUrl.split('/').pop() || '已上傳合約')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={contractFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      查看
                    </a>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('確定要刪除合約檔案嗎？')) {
                          try {
                            const response = await fetch(`/api/quotations/${quotation.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ contract_file_url: null }),
                            })
                            if (response.ok) {
                              setContractFileUrl('')
                              toast.success('合約已刪除')
                            } else {
                              throw new Error('刪除失敗')
                            }
                          } catch {
                            toast.error('刪除合約失敗')
                          }
                        }
                      }}
                      className="text-sm text-red-600 hover:text-red-700 cursor-pointer"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              )}
              {contractFile && (
                <div className="mb-2 p-3 bg-blue-50 border border-blue-300 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{contractFile.name}</p>
                      <p className="text-xs text-gray-500">{(contractFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setContractFile(null)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    移除
                  </button>
                </div>
              )}
              <input
                type="file"
                id="contract"
                onChange={handleContractFileChange}
                accept="*/*"
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">支援所有檔案格式，檔案大小上限 10MB</p>
            </div>
          </div>
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
