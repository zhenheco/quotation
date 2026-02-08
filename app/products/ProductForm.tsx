'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import FormInput from '@/components/ui/FormInput'
import BilingualFormInput from '@/components/ui/BilingualFormInput'
import {
  useCreateProduct,
  useUpdateProduct,
  useProduct,
  calculateProfitMargin,
  calculateSellingPrice,
  type Product,
  type CreateProductInput,
  type UpdateProductInput,
} from '@/hooks/useProducts'
import { usePermission } from '@/hooks/usePermission'
import { safeToLocaleString } from '@/lib/utils/formatters'
import { calculateGrossMargin } from '@/lib/utils/profit-calculator'
import { SupplierCostEditor } from '@/components/products/SupplierCostEditor'
import { getSelectedCompanyId } from '@/lib/utils/company-context'

interface ProductFormProps {
  product?: Product
}

const CURRENCIES = ['TWD', 'USD', 'EUR', 'JPY', 'CNY']

const PRESET_CATEGORIES = [
  { value: 'service', label: '服務' },
  { value: 'product', label: '產品' },
  { value: 'software', label: '軟體' },
  { value: 'hardware', label: '硬體' },
  { value: 'consulting', label: '諮詢' },
  { value: 'maintenance', label: '維護' },
  { value: 'design', label: '設計' },
  { value: 'training', label: '培訓' },
]

export default function ProductForm({ product: initialProduct }: ProductFormProps) {
  const router = useRouter()

  // 如果是編輯模式且有 product.id，使用 hook 取得最新資料
  const { data: fetchedProduct } = useProduct(initialProduct?.id || '')
  const product = fetchedProduct || initialProduct

  // 權限檢查
  const { hasPermission: canSeeCost } = usePermission(
    'products',
    'read_cost'
  )
  const { hasPermission: canEditCost } = usePermission('products', 'write_cost')

  // Mutations
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct(product?.id || '')

  // 表單狀態
  const [formData, setFormData] = useState({
    productNumber: '',
    nameZh: '',
    nameEn: '',
    descriptionZh: '',
    descriptionEn: '',
    basePrice: '',
    baseCurrency: 'TWD',
    category: '',
    // 成本相關欄位
    costPrice: '',
    costCurrency: 'TWD',
    profitMargin: '',
    supplier: '',
    supplierCode: '',
    sku: '',
  })

  // 新商品時自動生成編號
  useEffect(() => {
    async function fetchGeneratedNumber() {
      if (!product) {
        const companyId = getSelectedCompanyId()
        if (companyId) {
          try {
            const response = await fetch(`/api/products/generate-number?company_id=${companyId}`)
            if (response.ok) {
              const data = await response.json() as { product_number?: string }
              if (data.product_number) {
                setFormData(prev => ({ ...prev, productNumber: data.product_number }))
              }
            }
          } catch (error) {
            console.error('Failed to generate product number:', error)
          }
        }
      }
    }
    fetchGeneratedNumber()
  }, [product])

  // 自動計算模式（利潤率 <-> 售價）
  const [autoCalculateMode, setAutoCalculateMode] = useState<'sellingPrice' | 'profitMargin'>(
    'sellingPrice'
  )

  // 類別選擇狀態（用於判斷是否選擇「其他」）
  const [isOtherCategory, setIsOtherCategory] = useState(false)

  // 用 render 階段同步模式，從 product 同步表單資料
  const [prevProduct, setPrevProduct] = useState(product)
  if (product !== prevProduct) {
    setPrevProduct(product)
    if (product) {
      const name = product.name as { zh: string; en: string }
      const description = product.description as { zh: string; en: string } | null
      const productCategory = product.category || ''

      setFormData({
        productNumber: (product as { product_number?: string }).product_number || '',
        nameZh: name.zh || '',
        nameEn: name.en || '',
        descriptionZh: description?.zh || '',
        descriptionEn: description?.en || '',
        basePrice: product.base_price?.toString() || '',
        baseCurrency: product.base_currency || 'TWD',
        category: productCategory,
        costPrice: product.cost_price?.toString() || '',
        costCurrency: product.cost_currency || product.base_currency || 'TWD',
        profitMargin: product.profit_margin?.toString() || '',
        supplier: product.supplier || '',
        supplierCode: product.supplier_code || '',
        sku: product.sku || '',
      })

      const presetValues = PRESET_CATEGORIES.map(c => c.value)
      if (productCategory && !presetValues.includes(productCategory)) {
        setIsOtherCategory(true)
      }
    }
  }

  // 自動計算利潤率或售價（render 階段同步計算）
  {
    const cost = parseFloat(formData.costPrice)
    const price = parseFloat(formData.basePrice)
    const margin = parseFloat(formData.profitMargin)

    // 只在相同幣別時計算
    if (formData.costCurrency === formData.baseCurrency) {
      if (autoCalculateMode === 'profitMargin') {
        // 自動計算利潤率
        if (cost > 0 && price > 0) {
          const calculatedMargin = calculateProfitMargin(cost, price)
          if (Math.abs(calculatedMargin - margin) > 0.01) {
            setFormData((prev) => ({
              ...prev,
              profitMargin: calculatedMargin.toFixed(0),
            }))
          }
        }
      } else if (autoCalculateMode === 'sellingPrice') {
        // 自動計算售價
        if (cost > 0 && margin >= 0) {
          const calculatedPrice = calculateSellingPrice(cost, margin)
          if (Math.abs(calculatedPrice - price) > 0.01) {
            setFormData((prev) => ({
              ...prev,
              basePrice: calculatedPrice.toFixed(0),
            }))
          }
        }
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const basePrice = parseFloat(formData.basePrice) || 0

      const companyId = getSelectedCompanyId()

      // 基本資料
      const productData: CreateProductInput | UpdateProductInput = {
        name: {
          zh: formData.nameZh,
          en: formData.nameEn,
        },
        // 始終傳送 description 物件，即使是空字串（允許清空描述）
        description: {
          zh: formData.descriptionZh,
          en: formData.descriptionEn,
        },
        base_price: Math.round(basePrice),
        base_currency: formData.baseCurrency,
        // 傳送空字串或實際值（允許清空分類）
        category: formData.category || null,
        sku: formData.sku || undefined,
        product_number: formData.productNumber || undefined,
        company_id: companyId || undefined,
      }

      // 只有在有權限且有輸入成本時才加入成本相關欄位
      if (canEditCost && formData.costPrice) {
        const costPrice = parseFloat(formData.costPrice)
        if (!isNaN(costPrice) && costPrice >= 0) {
          productData.cost_price = costPrice
          productData.cost_currency = formData.costCurrency
          productData.supplier = formData.supplier || undefined
          productData.supplier_code = formData.supplierCode || undefined

          // 計算利潤率
          if (formData.costCurrency === formData.baseCurrency) {
            productData.profit_margin = calculateProfitMargin(costPrice, basePrice)
          }
        }
      }

      if (product) {
        // 更新產品
        await updateProduct.mutateAsync(productData as UpdateProductInput)
        toast.success('產品更新成功')
      } else {
        // 建立產品
        await createProduct.mutateAsync(productData as CreateProductInput)
        toast.success('產品建立成功')
      }

      router.push('/products')
    } catch (err) {
      console.error('Error saving product:', err)
      toast.error(err instanceof Error ? err.message : '儲存產品失敗')
    }
  }

  const isSubmitting = createProduct.isPending || updateProduct.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 基本資訊 */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-gray-900">基本資訊</h3>

        {/* 商品編號 */}
        <FormInput
          label="產品編號"
          name="productNumber"
          type="text"
          value={formData.productNumber}
          onChange={(value) => setFormData({ ...formData, productNumber: value })}
          placeholder="PRD202512-0001"
        />

        <BilingualFormInput
          label="產品名稱"
          name="name"
          valueZh={formData.nameZh}
          valueEn={formData.nameEn}
          onChangeZh={(value) => setFormData({ ...formData, nameZh: value })}
          onChangeEn={(value) => setFormData({ ...formData, nameEn: value })}
          placeholderZh="請輸入中文名稱"
          placeholderEn="Enter English name"
        />

        <BilingualFormInput
          label="產品描述"
          name="description"
          type="textarea"
          valueZh={formData.descriptionZh}
          valueEn={formData.descriptionEn}
          onChangeZh={(value) => setFormData({ ...formData, descriptionZh: value })}
          onChangeEn={(value) => setFormData({ ...formData, descriptionEn: value })}
          placeholderZh="請輸入中文描述"
          placeholderEn="Enter English description"
          rows={4}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormInput
            label="售價"
            name="basePrice"
            type="number"
            step="1"
            min="0"
            max="999999999"
            value={formData.basePrice}
            onChange={(value) => {
              setFormData({ ...formData, basePrice: value })
              setAutoCalculateMode('profitMargin')
            }}
            placeholder="0"
          />

          <div>
            <label htmlFor="baseCurrency" className="block text-sm font-medium text-gray-700 mb-1">
              幣別
            </label>
            <select
              id="baseCurrency"
              name="baseCurrency"
              value={formData.baseCurrency}
              onChange={(e) => setFormData({ ...formData, baseCurrency: e.target.value })}
              className={`block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${formData.baseCurrency ? 'text-gray-900 font-medium' : 'text-gray-700'}`}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              分類
            </label>
            <select
              id="category"
              name="category"
              value={isOtherCategory ? 'other' : formData.category}
              onChange={(e) => {
                const value = e.target.value
                if (value === 'other') {
                  setIsOtherCategory(true)
                  setFormData({ ...formData, category: '' })
                } else {
                  setIsOtherCategory(false)
                  setFormData({ ...formData, category: value })
                }
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">請選擇分類</option>
              {PRESET_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
              <option value="other">其他</option>
            </select>
            {isOtherCategory && (
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="請輸入自訂分類"
                className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            )}
          </div>

          <FormInput
            label="SKU"
            name="sku"
            value={formData.sku}
            onChange={(value) => setFormData({ ...formData, sku: value })}
            placeholder="請輸入 SKU"
          />
        </div>
      </div>

      {/* 成本資訊（需要權限） */}
      {canSeeCost && (
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">成本資訊</h3>
            {!canEditCost && (
              <span className="text-sm text-amber-600">僅供檢視</span>
            )}
          </div>

          {canEditCost ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormInput
                  label="成本價格"
                  name="costPrice"
                  type="number"
                  step="1"
                  min="0"
                  max="999999999"
                  value={formData.costPrice}
                  onChange={(value) => {
                    setFormData({ ...formData, costPrice: value })
                    setAutoCalculateMode('profitMargin')
                  }}
                  placeholder="0"
                />

                <div>
                  <label
                    htmlFor="costCurrency"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    成本幣別
                  </label>
                  <select
                    id="costCurrency"
                    name="costCurrency"
                    value={formData.costCurrency}
                    onChange={(e) => setFormData({ ...formData, costCurrency: e.target.value })}
                    className={`block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${formData.costCurrency ? 'text-gray-900 font-medium' : 'text-gray-700'}`}
                  >
                    {CURRENCIES.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 利潤率計算（僅在相同幣別時） */}
              {formData.costCurrency === formData.baseCurrency && formData.costPrice && (
                <div className="bg-indigo-50 p-4 rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormInput
                      label="成本加成率 (Markup)"
                      name="profitMargin"
                      type="number"
                      step="1"
                      value={formData.profitMargin}
                      onChange={(value) => {
                        setFormData({ ...formData, profitMargin: value })
                        setAutoCalculateMode('sellingPrice')
                      }}
                      placeholder="0"
                      suffix="%"
                    />
                    {/* 毛利率（唯讀，自動計算） */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        毛利率 (Gross Margin)
                      </label>
                      <div className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-700">
                        {(() => {
                          const cost = parseFloat(formData.costPrice)
                          const price = parseFloat(formData.basePrice)
                          if (cost > 0 && price > 0) {
                            return `${calculateGrossMargin(cost, price).toFixed(2)}%`
                          }
                          return '-'
                        })()}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    成本加成率 = (售價-成本)/成本 | 毛利率 = (售價-成本)/售價
                  </p>
                </div>
              )}

              {/* 多供應商管理（僅編輯模式） */}
              {product?.id && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">供應商</h4>
                  <SupplierCostEditor
                    productId={product.id}
                    canEdit={canEditCost}
                    basePrice={parseFloat(formData.basePrice) || undefined}
                    baseCurrency={formData.baseCurrency}
                  />
                </div>
              )}

              {/* 快速供應商輸入（新增模式） */}
              {!product?.id && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormInput
                    label="供應商"
                    name="supplier"
                    value={formData.supplier}
                    onChange={(value) => setFormData({ ...formData, supplier: value })}
                    placeholder="請輸入供應商名稱"
                  />

                  <FormInput
                    label="供應商編號"
                    name="supplierCode"
                    value={formData.supplierCode}
                    onChange={(value) => setFormData({ ...formData, supplierCode: value })}
                    placeholder="請輸入供應商編號"
                  />
                </div>
              )}
            </>
          ) : (
            // 唯讀模式顯示成本
            product && product.cost_price && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">成本價格</span>
                  <span className="font-medium">
                    {product.cost_currency || product.base_currency}{' '}
                    {safeToLocaleString(product.cost_price)}
                  </span>
                </div>
                {product.profit_margin !== null && product.profit_margin !== undefined && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">成本加成率</span>
                      <span className="font-medium text-green-600">
                        {product.profit_margin.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">毛利率</span>
                      <span className="font-medium text-blue-600">
                        {product.base_price && product.cost_price
                          ? `${calculateGrossMargin(product.cost_price, product.base_price).toFixed(2)}%`
                          : '-'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* 按鈕 */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => router.push('/products')}
          disabled={isSubmitting}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '儲存中...' : '儲存'}
        </button>
      </div>
    </form>
  )
}
