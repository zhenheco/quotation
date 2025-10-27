'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
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

interface ProductFormProps {
  locale: string
  product?: Product
}

const CURRENCIES = ['TWD', 'USD', 'EUR', 'JPY', 'CNY']

export default function ProductForm({ locale, product: initialProduct }: ProductFormProps) {
  const t = useTranslations()
  const router = useRouter()

  // 如果是編輯模式且有 product.id，使用 hook 取得最新資料
  const { data: fetchedProduct } = useProduct(initialProduct?.id || '')
  const product = fetchedProduct || initialProduct

  // 權限檢查
  const { hasPermission: canSeeCost, loading: permissionLoading } = usePermission(
    'products',
    'read_cost'
  )
  const { hasPermission: canEditCost } = usePermission('products', 'write_cost')

  // Mutations
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct(product?.id || '')

  // 表單狀態
  const [formData, setFormData] = useState({
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

  // 自動計算模式（利潤率 <-> 售價）
  const [autoCalculateMode, setAutoCalculateMode] = useState<'sellingPrice' | 'profitMargin'>(
    'sellingPrice'
  )

  // 從 product 初始化表單
  useEffect(() => {
    if (product) {
      const name = product.name as { zh: string; en: string }
      const description = product.description as { zh: string; en: string } | null

      setFormData({
        nameZh: name.zh || '',
        nameEn: name.en || '',
        descriptionZh: description?.zh || '',
        descriptionEn: description?.en || '',
        basePrice: product.base_price?.toString() || '',
        baseCurrency: product.base_currency || 'TWD',
        category: product.category || '',
        costPrice: product.cost_price?.toString() || '',
        costCurrency: product.cost_currency || product.base_currency || 'TWD',
        profitMargin: product.profit_margin?.toString() || '',
        supplier: product.supplier || '',
        supplierCode: product.supplier_code || '',
        sku: product.sku || '',
      })
    }
  }, [product])

  // 自動計算利潤率或售價
  useEffect(() => {
    const cost = parseFloat(formData.costPrice)
    const price = parseFloat(formData.basePrice)
    const margin = parseFloat(formData.profitMargin)

    // 只在相同幣別時計算
    if (formData.costCurrency !== formData.baseCurrency) {
      return
    }

    if (autoCalculateMode === 'profitMargin') {
      // 自動計算利潤率
      if (cost > 0 && price > 0) {
        const calculatedMargin = calculateProfitMargin(cost, price)
        if (Math.abs(calculatedMargin - margin) > 0.01) {
          setFormData((prev) => ({
            ...prev,
            profitMargin: calculatedMargin.toFixed(2),
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
            basePrice: calculatedPrice.toFixed(2),
          }))
        }
      }
    }
  }, [
    formData.costPrice,
    formData.basePrice,
    formData.profitMargin,
    formData.costCurrency,
    formData.baseCurrency,
    autoCalculateMode,
  ])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const basePrice = parseFloat(formData.basePrice)
      if (isNaN(basePrice) || basePrice < 0) {
        toast.error(t('product.invalidPrice'))
        return
      }

      // 基本資料
      const productData: CreateProductInput | UpdateProductInput = {
        name: {
          zh: formData.nameZh,
          en: formData.nameEn,
        },
        description: formData.descriptionZh || formData.descriptionEn
          ? {
              zh: formData.descriptionZh,
              en: formData.descriptionEn,
            }
          : undefined,
        base_price: basePrice,
        base_currency: formData.baseCurrency,
        category: formData.category || undefined,
        sku: formData.sku || undefined,
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
        toast.success(t('product.updateSuccess'))
      } else {
        // 建立產品
        await createProduct.mutateAsync(productData as CreateProductInput)
        toast.success(t('product.createSuccess'))
      }

      router.push(`/${locale}/products`)
    } catch (err) {
      console.error('Error saving product:', err)
      toast.error(err instanceof Error ? err.message : t('product.saveFailed'))
    }
  }

  const isSubmitting = createProduct.isPending || updateProduct.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本資訊 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">{t('product.basicInfo')}</h3>

        <BilingualFormInput
          label={t('product.name')}
          name="name"
          valueZh={formData.nameZh}
          valueEn={formData.nameEn}
          onChangeZh={(value) => setFormData({ ...formData, nameZh: value })}
          onChangeEn={(value) => setFormData({ ...formData, nameEn: value })}
          placeholderZh={t('product.namePlaceholder.zh')}
          placeholderEn={t('product.namePlaceholder.en')}
          required
        />

        <BilingualFormInput
          label={t('product.description')}
          name="description"
          type="textarea"
          valueZh={formData.descriptionZh}
          valueEn={formData.descriptionEn}
          onChangeZh={(value) => setFormData({ ...formData, descriptionZh: value })}
          onChangeEn={(value) => setFormData({ ...formData, descriptionEn: value })}
          placeholderZh={t('product.descriptionPlaceholder.zh')}
          placeholderEn={t('product.descriptionPlaceholder.en')}
          rows={4}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label={t('product.price')}
            name="basePrice"
            type="number"
            step="0.01"
            value={formData.basePrice}
            onChange={(value) => {
              setFormData({ ...formData, basePrice: value })
              setAutoCalculateMode('profitMargin')
            }}
            placeholder="0.00"
            required
          />

          <div>
            <label htmlFor="baseCurrency" className="block text-sm font-medium text-gray-700 mb-1">
              {t('product.currency')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              id="baseCurrency"
              name="baseCurrency"
              value={formData.baseCurrency}
              onChange={(e) => setFormData({ ...formData, baseCurrency: e.target.value })}
              required
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label={t('product.category')}
            name="category"
            value={formData.category}
            onChange={(value) => setFormData({ ...formData, category: value })}
            placeholder={t('product.categoryPlaceholder')}
          />

          <FormInput
            label={t('product.sku')}
            name="sku"
            value={formData.sku}
            onChange={(value) => setFormData({ ...formData, sku: value })}
            placeholder={t('product.skuPlaceholder')}
          />
        </div>
      </div>

      {/* 成本資訊（需要權限） */}
      {canSeeCost && (
        <div className="space-y-4 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">{t('product.costInfo')}</h3>
            {!canEditCost && (
              <span className="text-sm text-amber-600">{t('product.costReadOnly')}</span>
            )}
          </div>

          {canEditCost ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label={t('product.costPrice')}
                  name="costPrice"
                  type="number"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(value) => {
                    setFormData({ ...formData, costPrice: value })
                    setAutoCalculateMode('profitMargin')
                  }}
                  placeholder="0.00"
                />

                <div>
                  <label
                    htmlFor="costCurrency"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t('product.costCurrency')}
                  </label>
                  <select
                    id="costCurrency"
                    name="costCurrency"
                    value={formData.costCurrency}
                    onChange={(e) => setFormData({ ...formData, costCurrency: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <FormInput
                    label={t('product.profitMargin')}
                    name="profitMargin"
                    type="number"
                    step="0.01"
                    value={formData.profitMargin}
                    onChange={(value) => {
                      setFormData({ ...formData, profitMargin: value })
                      setAutoCalculateMode('sellingPrice')
                    }}
                    placeholder="0.00"
                    suffix="%"
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    {t('product.profitMarginHint')}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label={t('product.supplier')}
                  name="supplier"
                  value={formData.supplier}
                  onChange={(value) => setFormData({ ...formData, supplier: value })}
                  placeholder={t('product.supplierPlaceholder')}
                />

                <FormInput
                  label={t('product.supplierCode')}
                  name="supplierCode"
                  value={formData.supplierCode}
                  onChange={(value) => setFormData({ ...formData, supplierCode: value })}
                  placeholder={t('product.supplierCodePlaceholder')}
                />
              </div>
            </>
          ) : (
            // 唯讀模式顯示成本
            product && product.cost_price && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('product.costPrice')}</span>
                  <span className="font-medium">
                    {product.cost_currency || product.base_currency}{' '}
                    {product.cost_price.toLocaleString()}
                  </span>
                </div>
                {product.profit_margin !== null && product.profit_margin !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('product.profitMargin')}</span>
                    <span className="font-medium text-green-600">
                      {product.profit_margin.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* 按鈕 */}
      <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/products`)}
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
