'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Combobox } from '@headlessui/react'
import {
  useCreateQuotation,
  useUpdateQuotation,
  useQuotation,
  useQuotationVersions,
  type CreateQuotationItemInput,
  type BilingualText,
} from '@/hooks/useQuotations'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { QuotationVersion, ExchangeRate } from '@/types/models'
import { useCustomers, type Customer } from '@/hooks/useCustomers'
import { useProducts } from '@/hooks/useProducts'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { PaymentTermsEditor } from '@/components/payment-terms'
import { safeToLocaleString } from '@/lib/utils/formatters'
import { apiPost, apiPatch, apiGet } from '@/lib/api-client'
import { getSelectedCompanyId } from '@/lib/utils/company-context'
import OwnerSelect from '@/components/team/OwnerSelect'

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
  quotationId?: string
}

const CURRENCIES = ['TWD', 'USD', 'EUR', 'JPY', 'CNY']

interface QuotationItem {
  product_id: string
  image_url?: string
  image_file?: File
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
  is_custom: boolean
  custom_description_zh: string
  custom_description_en: string
}

export default function QuotationForm({ quotationId }: QuotationFormProps) {
  const router = useRouter()
  const supabase = createClient()

  // 模式判斷
  const isEditMode = !!quotationId

  // Hooks
  const { data: customers = [], isLoading: loadingCustomers } = useCustomers()
  const { data: products = [], isLoading: loadingProducts } = useProducts()
  const { data: existingQuotation } = useQuotation(quotationId || '')
  const { data: versions = [] } = useQuotationVersions(quotationId || '')
  const createQuotation = useCreateQuotation()
  const updateQuotation = useUpdateQuotation(quotationId || '')

  // 狀態
  const [customerQuery, setCustomerQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({
    customerId: '',
    ownerId: '',
    issueDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'TWD',
    taxRate: '5',
    showTax: true,
    discountAmount: '0',
    discountDescription: '',
    notes: '',
    paymentMethod: '',
    paymentNotes: '',
    status: 'draft' as 'draft' | 'sent' | 'accepted' | 'expired',
  })
  const [items, setItems] = useState<QuotationItem[]>([])
  const [error, setError] = useState('')
  const [showNotesTemplates, setShowNotesTemplates] = useState(false)
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [contractFileUrl, setContractFileUrl] = useState<string>('')
  const [paymentTerms, setPaymentTerms] = useState<Partial<PaymentTerm>[]>([])

  // 編輯模式特有狀態
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({})
  const [showVersionHistory, setShowVersionHistory] = useState(false)

  // 取得匯率資料（僅編輯模式）
  useEffect(() => {
    if (!isEditMode) return

    const fetchExchangeRates = async () => {
      try {
        const data = await apiGet<{ success?: boolean; rates?: Record<string, number> }>(`/api/exchange-rates?base=${formData.currency}`)
        if (data.success && data.rates) {
          setExchangeRates(data.rates)
        }
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error)
      }
    }
    fetchExchangeRates()
  }, [formData.currency, isEditMode])

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
      const quotationWithNewFields = existingQuotation as {
        owner_id?: string
        payment_method?: string
        payment_notes?: string
        show_tax?: boolean
        discount_amount?: number
        discount_description?: string | null
      }
      setFormData({
        customerId: existingQuotation.customer_id,
        ownerId: quotationWithNewFields.owner_id || '',
        issueDate: formatDateForInput(existingQuotation.issue_date),
        validUntil: formatDateForInput(existingQuotation.valid_until),
        currency: existingQuotation.currency,
        taxRate: existingQuotation.tax_rate?.toString() || '5',
        showTax: quotationWithNewFields.show_tax !== false,
        discountAmount: quotationWithNewFields.discount_amount?.toString() || '0',
        discountDescription: quotationWithNewFields.discount_description || '',
        notes: typeof existingQuotation.notes === 'string'
          ? existingQuotation.notes
          : (existingQuotation.notes as unknown as BilingualText)?.['zh'] || '',
        paymentMethod: quotationWithNewFields.payment_method || '',
        paymentNotes: quotationWithNewFields.payment_notes || '',
        status: existingQuotation.status || 'draft',
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

      // 載入報價單項目
      interface QuotationItemResponse {
        id: string
        quotation_id: string
        product_id: string | null
        description: BilingualText | string
        quantity: number
        unit_price: number
        discount: number
        subtotal: number
      }
      const existingItems = (existingQuotation as { items?: QuotationItemResponse[] }).items
      if (existingItems && existingItems.length > 0) {
        setItems(existingItems.map(item => {
          const isCustom = !item.product_id
          const description = typeof item.description === 'object'
            ? item.description as BilingualText
            : { zh: item.description || '', en: item.description || '' }
          return {
            product_id: item.product_id || '',
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount || 0,
            subtotal: item.subtotal,
            is_custom: isCustom,
            custom_description_zh: isCustom ? description.zh : '',
            custom_description_en: isCustom ? description.en : '',
          }
        }))
      }
    }
  }, [existingQuotation, customers])

  // 載入現有付款條款（編輯模式）
  useEffect(() => {
    if (!quotationId || !isEditMode) return

    const fetchPaymentTerms = async () => {
      try {
        const data = await apiGet<{ payment_terms?: PaymentTerm[] }>(`/api/quotations/${quotationId}/payment-terms`)
        if (data.payment_terms && data.payment_terms.length > 0) {
          setPaymentTerms(data.payment_terms)
        }
      } catch (error) {
        console.error('Failed to fetch payment terms:', error)
      }
    }

    fetchPaymentTerms()
  }, [quotationId, isEditMode])

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
      if (!user) throw new Error('請先登入')

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
      console.error('Upload contract failed:', error)
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
          : (customer.name as unknown as BilingualText)['zh']
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
        image_url: undefined,
        image_file: undefined,
        quantity: 1,
        unit_price: 0,
        discount: 0,
        subtotal: 0,
        is_custom: false,
        custom_description_zh: '',
        custom_description_en: '',
      },
    ])
  }

  // 刪除行項目
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // 處理產品選擇（含匯率轉換）
  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    let convertedPrice = product.base_price

    // 如果產品幣別與報價單幣別不同，進行匯率換算
    if (isEditMode && product.base_currency && product.base_currency !== formData.currency) {
      const rate = exchangeRates[product.base_currency]
      if (rate && rate !== 0) {
        convertedPrice = product.base_price / rate
      } else {
        console.warn(`No exchange rate found for ${product.base_currency} to ${formData.currency}`)
      }
    }

    const newItems = [...items]
    const currentItem = newItems[index]

    const quantity = typeof currentItem.quantity === 'number' && currentItem.quantity > 0
      ? currentItem.quantity
      : 1

    const discount = typeof currentItem.discount === 'number'
      ? currentItem.discount
      : 0

    const validPrice = typeof convertedPrice === 'number' && !isNaN(convertedPrice) && convertedPrice >= 0
      ? convertedPrice
      : 0

    const subtotal = (validPrice * quantity) - discount

    newItems[index] = {
      ...currentItem,
      product_id: productId,
      unit_price: validPrice,
      quantity,
      discount,
      subtotal: Math.max(0, subtotal),
    }

    setItems(newItems)
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

    // 如果選擇產品，使用 handleProductChange 處理（含匯率轉換）
    if (field === 'product_id') {
      handleProductChange(index, value as string)
      return
    }

    setItems(newItems)
  }

  // 處理自訂品項圖片上傳
  const handleItemImageChange = (index: number, file: File | null) => {
    const newItems = [...items]

    if (file) {
      // 驗證檔案類型
      if (!file.type.startsWith('image/')) {
        toast.error('請上傳圖片檔案')
        return
      }
      // 驗證檔案大小 (2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('圖片大小不能超過 2MB')
        return
      }

      // 創建預覽 URL
      const previewUrl = URL.createObjectURL(file)
      newItems[index] = {
        ...newItems[index],
        image_file: file,
        image_url: previewUrl,
      }
    } else {
      // 清除圖片
      if (newItems[index].image_url?.startsWith('blob:')) {
        URL.revokeObjectURL(newItems[index].image_url!)
      }
      newItems[index] = {
        ...newItems[index],
        image_file: undefined,
        image_url: undefined,
      }
    }

    setItems(newItems)
  }

  // 計算總計（含整體折扣）
  const calculateTotals = () => {
    const itemsSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    const discountAmount = parseFloat(formData.discountAmount) || 0
    const adjustedSubtotal = itemsSubtotal - discountAmount
    const taxRate = formData.showTax ? (parseFloat(formData.taxRate) || 0) : 0
    const taxAmount = (adjustedSubtotal * taxRate) / 100
    const total = adjustedSubtotal + taxAmount
    return { subtotal: itemsSubtotal, discountAmount, adjustedSubtotal, taxAmount, total }
  }

  const { subtotal, discountAmount, adjustedSubtotal, taxAmount, total } = calculateTotals()

  // 提交表單
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      if (!formData.customerId) {
        toast.error('請選擇客戶')
        return
      }

      // 驗證品項：每個品項必須有產品或自訂描述
      const hasInvalidItems = items.some(item => {
        if (item.is_custom) {
          return !item.custom_description_zh && !item.custom_description_en
        }
        return !item.product_id
      })
      if (items.length === 0 || hasInvalidItems) {
        toast.error('請至少新增一個產品')
        return
      }

      let newQuotationId = quotationId

      const companyId = getSelectedCompanyId()
      if (!companyId) {
        toast.error('請先選擇公司')
        return
      }

      const quotationData = {
        company_id: companyId,
        customer_id: formData.customerId,
        owner_id: formData.ownerId || undefined,
        issue_date: formData.issueDate,
        valid_until: formData.validUntil,
        currency: formData.currency,
        subtotal: adjustedSubtotal,
        tax_rate: parseFloat(formData.taxRate),
        tax_amount: taxAmount,
        total_amount: total,
        show_tax: formData.showTax,
        discount_amount: discountAmount,
        discount_description: formData.discountDescription || undefined,
        notes: formData.notes ? {
          zh: formData.notes,
          en: formData.notes,
        } as BilingualText : undefined,
        payment_method: formData.paymentMethod || undefined,
        payment_notes: formData.paymentNotes || undefined,
        items: items.map((item) => {
          // 自訂品項使用手動輸入的描述
          if (item.is_custom) {
            return {
              product_id: undefined,
              description: {
                zh: item.custom_description_zh || '',
                en: item.custom_description_en || '',
              },
              quantity: item.quantity,
              unit_price: item.unit_price,
              discount: item.discount,
              subtotal: item.subtotal,
            } as CreateQuotationItemInput
          }
          // 產品品項使用產品名稱
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
        newQuotationId = quotationId
        toast.success('報價單已更新')
      } else {
        const result = await createQuotation.mutateAsync(quotationData)
        newQuotationId = (result as { id?: string }).id
        toast.success('報價單已建立')
      }

      // 儲存付款條款
      if (paymentTerms.length > 0 && newQuotationId) {
        try {
          const termsToSave = paymentTerms.map((term, index) => ({
            term_number: term.term_number ?? index + 1,
            percentage: term.percentage ?? 0,
            due_date: term.due_date ?? null,
          }))
          console.log('[QuotationForm] Saving payment terms:', {
            quotationId: newQuotationId,
            termsCount: termsToSave.length,
            terms: termsToSave
          })
          const result = await apiPost<{ payment_terms?: unknown[] }>(`/api/quotations/${newQuotationId}/payment-terms`, {
            terms: termsToSave,
            total,
          })
          console.log('[QuotationForm] Payment terms saved:', result)
        } catch (paymentTermsError) {
          console.error('Failed to save payment terms:', paymentTermsError)
          toast.error('儲存付款條款失敗')
        }
      } else {
        console.log('[QuotationForm] Skipping payment terms:', {
          termsCount: paymentTerms.length,
          quotationId: newQuotationId
        })
      }

      // 上傳合約檔案
      if (contractFile && newQuotationId) {
        const contractUrl = await uploadContractFile(newQuotationId)
        if (contractUrl) {
          // 更新報價單的合約 URL
          await apiPatch(`/api/quotations/${newQuotationId}`, {
            contract_file_url: contractUrl,
            contract_file_name: contractFile?.name || null
          })
          toast.success('合約已上傳')
        }
      }

      router.push('/quotations')
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
        <p className="text-gray-600 mb-4">尚無客戶資料，請先新增客戶</p>
        <button
          onClick={() => router.push('/customers/new')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer"
        >
          新增客戶
        </button>
      </div>
    )
  }

  const isSubmitting = createQuotation.isPending || updateQuotation.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* 基本資訊 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="customerId" className="block text-sm font-semibold text-gray-900 mb-1">
            客戶
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
                      : (customer.name as unknown as BilingualText)?.['zh'] || ''
                    return `${name} (${customer.email})`
                  }}
                  onChange={(event) => setCustomerQuery(event.target.value)}
                  placeholder="選擇客戶"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </Combobox.Button>
              <Combobox.Options className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-lg bg-white py-1 shadow-lg border border-gray-300 focus:outline-none">
                {filteredCustomers.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">無符合結果</div>
                ) : (
                  filteredCustomers.map((customer) => {
                    const name = typeof customer.name === 'string'
                      ? customer.name
                      : (customer.name as unknown as BilingualText)?.['zh'] || ''
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
              幣別
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

        {/* 負責人選擇 */}
        <div>
          <label htmlFor="ownerId" className="block text-sm font-semibold text-gray-900 mb-1">
            負責人
          </label>
          <OwnerSelect
            companyId={getSelectedCompanyId() || ''}
            value={formData.ownerId}
            onChange={(ownerId) => setFormData({ ...formData, ownerId })}
          />
          <p className="mt-1 text-xs text-gray-500">選擇負責此報價單的團隊成員</p>
        </div>

        {/* 狀態選擇（僅編輯模式） */}
        {isEditMode && (
          <div>
            <label htmlFor="status" className="block text-sm font-semibold text-gray-900 mb-1">
              狀態
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'sent' | 'accepted' | 'expired' })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="draft">草稿</option>
              <option value="sent">已發送</option>
              <option value="accepted">已接受</option>
              <option value="expired">已過期</option>
            </select>
          </div>
        )}

        <div>
          <label htmlFor="issueDate" className="block text-sm font-semibold text-gray-900 mb-1">
            開立日期
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="date"
            id="issueDate"
            value={formData.issueDate}
            onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            readOnly={isEditMode}
            disabled={isEditMode}
          />
        </div>

        <div>
          <label htmlFor="validUntil" className="block text-sm font-semibold text-gray-900 mb-1">
            有效期限
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
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="taxRate" className="block text-sm font-semibold text-gray-900">
              稅率 (%)
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showTax}
                onChange={(e) => setFormData({ ...formData, showTax: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-600">顯示稅金</span>
            </label>
          </div>
          <input
            type="number"
            id="taxRate"
            value={formData.taxRate}
            onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            min="0"
            max="100"
            step="1"
            disabled={!formData.showTax}
          />
        </div>
      </div>

      {/* 行項目 */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium text-gray-900">報價項目</h3>
          <button
            type="button"
            onClick={handleAddItem}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer"
          >
            新增項目
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-3">
              <div className="grid grid-cols-7 gap-3 items-start">
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      產品
                    </label>
                    {/* 品項模式切換 */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = [...items]
                          newItems[index] = { ...newItems[index], is_custom: false, product_id: '' }
                          setItems(newItems)
                        }}
                        className={`px-2 py-0.5 text-xs rounded ${
                          !item.is_custom ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        選擇產品
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = [...items]
                          newItems[index] = { ...newItems[index], is_custom: true, product_id: '' }
                          setItems(newItems)
                        }}
                        className={`px-2 py-0.5 text-xs rounded ${
                          item.is_custom ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        自訂項目
                      </button>
                    </div>
                  </div>
                  {item.is_custom ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={item.custom_description_zh}
                        onChange={(e) => {
                          const newItems = [...items]
                          newItems[index] = { ...newItems[index], custom_description_zh: e.target.value }
                          setItems(newItems)
                        }}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="中文描述"
                      />
                      <input
                        type="text"
                        value={item.custom_description_en}
                        onChange={(e) => {
                          const newItems = [...items]
                          newItems[index] = { ...newItems[index], custom_description_en: e.target.value }
                          setItems(newItems)
                        }}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="英文描述"
                      />
                    </div>
                  ) : (
                    <select
                      value={item.product_id}
                      onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">選擇產品</option>
                      {products.map((product) => {
                        const name = typeof product.name === 'string'
                          ? product.name
                          : (product.name as unknown as BilingualText)?.['zh'] || ''
                        return (
                          <option key={product.id} value={product.id}>
                            {name} ({product.base_currency} {product.base_price})
                          </option>
                        )
                      })}
                    </select>
                  )}
                </div>

                {/* 產品圖片欄位 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    產品圖片
                  </label>
                  <div className="relative w-20 h-20 border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                    {item.image_url ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element -- blob URLs not supported by next/image */}
                        <img
                          src={item.image_url}
                          alt="產品圖片"
                          className="w-full h-full object-cover"
                        />
                        {item.is_custom && (
                          <button
                            type="button"
                            onClick={() => handleItemImageChange(index, null)}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        )}
                      </>
                    ) : item.is_custom ? (
                      <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-100">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs text-gray-400 mt-1">上傳圖片</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleItemImageChange(index, file)
                          }}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full h-full text-gray-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs mt-1">無圖片</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    數量
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
                    單價
                  </label>
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                    step="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    折扣
                  </label>
                  <input
                    type="number"
                    value={item.discount}
                    onChange={(e) => handleItemChange(index, 'discount', parseFloat(e.target.value) || 0)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                    step="1"
                  />
                </div>

                <div className="flex items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      小計
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                      {formData.currency} {safeToLocaleString(item.subtotal)}
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
              尚無報價項目
            </div>
          )}
        </div>
      </div>

      {/* 總計 */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="max-w-md ml-auto space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">項目小計:</span>
            <span className="text-gray-900 font-medium">
              {formData.currency} {safeToLocaleString(subtotal)}
            </span>
          </div>

          {/* 整體折扣 */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">整體折扣:</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">-</span>
              <span>{formData.currency}</span>
              <input
                type="number"
                value={formData.discountAmount}
                onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                className="w-24 px-2 py-1 border border-gray-300 rounded text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                min="0"
                step="1"
                placeholder="0"
              />
            </div>
          </div>

          {/* 折扣說明（折扣金額大於 0 時顯示） */}
          {parseFloat(formData.discountAmount) > 0 && (
            <div className="flex justify-end">
              <input
                type="text"
                value={formData.discountDescription}
                onChange={(e) => setFormData({ ...formData, discountDescription: e.target.value })}
                className="w-48 px-2 py-1 border border-gray-300 rounded text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="折扣說明（選填）"
              />
            </div>
          )}

          {/* 折後小計（有折扣時顯示） */}
          {parseFloat(formData.discountAmount) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">折後小計:</span>
              <span className="text-gray-900 font-medium">
                {formData.currency} {safeToLocaleString(adjustedSubtotal)}
              </span>
            </div>
          )}

          {/* 稅金（開啟時顯示） */}
          {formData.showTax && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                稅金 ({formData.taxRate}%):
              </span>
              <span className="text-gray-900 font-medium">
                {formData.currency} {safeToLocaleString(taxAmount)}
              </span>
            </div>
          )}

          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>總計:</span>
            <span>{formData.currency} {safeToLocaleString(total)}</span>
          </div>
        </div>
      </div>

      {/* 付款條款 */}
      <div>
        <PaymentTermsEditor
          terms={paymentTerms}
          totalAmount={total}
          currency={formData.currency}
          locale="zh"
          onChange={setPaymentTerms}
        />
      </div>

      {/* 備註 */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            備註
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
              備註範本
            </button>
            {showNotesTemplates && (
              <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-10 max-h-96 overflow-y-auto">
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 px-3 py-2">
                    選擇範本
                  </div>
                  {notesTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => {
                        const text = template['zh']
                        setFormData({ ...formData, notes: text })
                        setShowNotesTemplates(false)
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-lg"
                    >
                      {template.id === 'custom' ? (
                        <span className="text-gray-500">自訂備註</span>
                      ) : (
                        <span className="text-gray-700">{template['zh']}</span>
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
          placeholder="輸入備註內容..."
        />
      </div>

      {/* 付款資訊 */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">付款資訊</h3>

        <div className="space-y-3">
          {/* 付款方式 */}
          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
              付款方式（選填）
            </label>
            <select
              id="paymentMethod"
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- 選填 --</option>
              <option value="cash">現金</option>
              <option value="bank_transfer">銀行轉帳</option>
              <option value="ach_transfer">ACH 轉帳</option>
              <option value="credit_card">信用卡</option>
              <option value="check">支票</option>
              <option value="cryptocurrency">加密貨幣</option>
              <option value="other">其他</option>
            </select>
          </div>

          {/* 付款備註 */}
          <div>
            <label htmlFor="paymentNotes" className="block text-sm font-medium text-gray-700 mb-1">
              付款備註
            </label>
            <textarea
              id="paymentNotes"
              value={formData.paymentNotes}
              onChange={(e) => setFormData({ ...formData, paymentNotes: e.target.value })}
              rows={3}
              maxLength={500}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={(() => {
                const placeholders: Record<string, string> = {
                  cash: '請於約定時間以現金支付',
                  bank_transfer: '請填寫銀行帳號資訊',
                  ach_transfer: '請填寫 ACH 路由號碼',
                  credit_card: '可接受的信用卡類型',
                  check: '支票抬頭及寄送地址',
                  cryptocurrency: '錢包地址及接受的幣種',
                  other: '其他付款方式說明',
                }
                return formData.paymentMethod
                  ? placeholders[formData.paymentMethod] || '請輸入付款備註'
                  : '請輸入付款備註'
              })()}
            />
            <p className="mt-1 text-sm text-gray-500">
              {formData.paymentNotes.length} / 500
            </p>
          </div>
        </div>
      </div>

      {/* 版本歷史（僅編輯模式） */}
      {isEditMode && versions.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-900">版本歷史</h3>
            <button
              type="button"
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              {showVersionHistory ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  隱藏
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  顯示 ({versions.length})
                </>
              )}
            </button>
          </div>
          {showVersionHistory && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-96 overflow-y-auto">
              {versions.map((version) => (
                <div key={version.id} className="bg-white rounded-lg p-2 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      版本 {version.version_number}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(version.changed_at).toLocaleString('zh-TW')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    <pre className="whitespace-pre-wrap break-words">
                      {JSON.stringify(version.changes, null, 2)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
                  檢視
                </a>
                {quotationId && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('確定要刪除此合約檔案嗎？')) {
                        try {
                          await apiPatch(`/api/quotations/${quotationId}`, { contract_file_url: null })
                          setContractFileUrl('')
                          toast.success('合約已刪除')
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
            支援所有檔案類型，最大 10MB
          </p>
        </div>
      </div>

      {/* 提交按鈕 */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? '儲存中...' : quotationId ? '更新' : '建立'}
        </button>
      </div>
    </form>
  )
}
