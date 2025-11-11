'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Combobox } from '@headlessui/react'
import {
  useCreateQuotation,
  useUpdateQuotation,
  useQuotation,
  type CreateQuotationItemInput,
  type BilingualText,
} from '@/hooks/useQuotations'
import { useCustomers, type Customer } from '@/hooks/useCustomers'
import { useProducts } from '@/hooks/useProducts'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { PaymentTermsEditor } from '@/components/payment-terms'

interface PaymentTerm {
  id: string
  quotation_id: string
  term_number: number
  term_name: string
  percentage: number
  amount: number
  due_date: string | null
  paid_amount: number | null
  paid_date: string | null
  status: 'unpaid' | 'partial' | 'paid' | 'overdue'
  payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue'
  created_at: string
  updated_at: string
}

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
  const currentLocale = useLocale() as 'zh' | 'en'
  const router = useRouter()
  const supabase = createClient()

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
  const [showNotesTemplates, setShowNotesTemplates] = useState(false)
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [contractFileUrl, setContractFileUrl] = useState<string>('')
  const [paymentTerms, setPaymentTerms] = useState<Partial<PaymentTerm>[]>([])

  // 備註模版
  const notesTemplates = [
    {
      id: 'preliminary',
      zh: '此為初步報價，實際價格將依專案規模調整。',
      en: 'This is a preliminary quotation. Actual price will be adjusted based on project scope.'
    },
    {
      id: 'payment_terms',
      zh: '付款條件：簽約後付款30%，專案完成付款70%。',
      en: 'Payment terms: 30% upon contract signing, 70% upon project completion.'
    },
    {
      id: 'validity',
      zh: '本報價單有效期限為30天，逾期價格可能調整。',
      en: 'This quotation is valid for 30 days. Prices may be adjusted after expiration.'
    },
    {
      id: 'warranty',
      zh: '本專案提供3個月保固服務，保固期內免費修復bug。',
      en: 'This project includes 3 months warranty. Bug fixes are free during warranty period.'
    },
    {
      id: 'delivery',
      zh: '預計交付時間為簽約後2-4週，實際時間視專案複雜度而定。',
      en: 'Estimated delivery: 2-4 weeks after contract signing, actual time depends on project complexity.'
    },
    {
      id: 'custom',
      zh: '',
      en: ''
    }
  ]

  // 日期格式轉換函數
  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return ''
    return dateString.split('T')[0]
  }

  // 初始化編輯模式
  useEffect(() => {
    if (existingQuotation) {
      setFormData({
        customerId: existingQuotation.customer_id,
        issueDate: formatDateForInput(existingQuotation.issue_date),
        validUntil: formatDateForInput(existingQuotation.valid_until),
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

      // 載入現有合約
      if ((existingQuotation as { contract_file_url?: string }).contract_file_url) {
        setContractFileUrl((existingQuotation as { contract_file_url?: string }).contract_file_url || '')
      }
    }
  }, [existingQuotation, customers, locale])

  // 合約檔案處理
  const handleContractFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 驗證檔案大小 (10MB)
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

      // 上傳至 Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('quotation-contracts')
        .upload(filePath, contractFile, {
          contentType: contractFile.type,
        })

      if (uploadError) throw uploadError

      // 取得公開 URL
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
      if (product && product.base_price) {
        newItems[index].unit_price = product.base_price
        const quantity = parseFloat(newItems[index].quantity.toString()) || 0
        const discount = parseFloat(newItems[index].discount.toString()) || 0
        newItems[index].subtotal = quantity * product.base_price - discount
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
        toast.error('請選擇客戶')
        return
      }

      if (items.length === 0 || items.some(item => !item.product_id)) {
        toast.error('請至少新增一個產品')
        return
      }

      let newQuotationId = quotationId

      const quotationData = {
        customer_id: formData.customerId,
        issue_date: formData.issueDate,
        valid_until: formData.validUntil,
        currency: formData.currency,
        subtotal,
        tax_rate: parseFloat(formData.taxRate),
        tax_amount: taxAmount,
        total_amount: total,
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
            subtotal: item.subtotal,
          } as CreateQuotationItemInput
        }),
      }

      if (quotationId) {
        await updateQuotation.mutateAsync(quotationData)
        toast.success('報價單已更新')
      } else {
        const result = await createQuotation.mutateAsync(quotationData)
        newQuotationId = (result as { id?: string }).id
        toast.success('報價單已建立')
      }

      // 儲存付款條款
      if (paymentTerms.length > 0 && newQuotationId) {
        try {
          await fetch(`/api/quotations/${newQuotationId}/payment-terms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              terms: paymentTerms,
              total,
            }),
          })
        } catch (paymentTermsError) {
          console.error('Failed to save payment terms:', paymentTermsError)
          toast.error('付款條款儲存失敗')
        }
      }

      // 上傳合約檔案
      if (contractFile && newQuotationId) {
        const contractUrl = await uploadContractFile(newQuotationId)
        if (contractUrl) {
          // 更新報價單的合約 URL
          await fetch(`/api/quotations/${newQuotationId}`, {
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
            step={currentLocale === 'zh' ? '1' : '0.01'}
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
                          {name} ({product.base_currency} {product.base_price})
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
                    step={currentLocale === 'zh' ? '1' : '0.01'}
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
                    step={currentLocale === 'zh' ? '1' : '0.01'}
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

      {/* 付款條款 */}
      <div>
        <PaymentTermsEditor
          terms={paymentTerms}
          totalAmount={total}
          currency={formData.currency}
          locale={currentLocale}
          onChange={setPaymentTerms}
        />
      </div>

      {/* 備註 */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            {t('quotation.notes')}
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotesTemplates(!showNotesTemplates)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t('quotation.notesTemplates')}
            </button>
            {showNotesTemplates && (
              <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-10 max-h-96 overflow-y-auto">
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 px-3 py-2">
                    {t('quotation.selectTemplate')}
                  </div>
                  {notesTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => {
                        const text = template[locale as 'zh' | 'en']
                        setFormData({ ...formData, notes: text })
                        setShowNotesTemplates(false)
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-lg"
                    >
                      {template.id === 'custom' ? (
                        <span className="text-gray-500">{t('quotation.customNotes')}</span>
                      ) : (
                        <span className="text-gray-700">{template[locale as 'zh' | 'en']}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={4}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder={t('quotation.notesPlaceholder')}
        />
      </div>

      {/* 合約上傳 */}
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
                  {decodeURIComponent(contractFileUrl.split('/').pop() || '已上傳合約')}
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
                {quotationId && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('確定要刪除合約檔案嗎？')) {
                        try {
                          const response = await fetch(`/api/quotations/${quotationId}`, {
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
                )}
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
          <p className="mt-1 text-xs text-gray-500">
            支援所有檔案格式，檔案大小上限 10MB
          </p>
        </div>
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
