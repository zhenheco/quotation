'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import FormInput from '@/components/ui/FormInput'
import BilingualFormInput from '@/components/ui/BilingualFormInput'

interface Product {
  id: string
  name: { zh: string; en: string }
  description: { zh: string; en: string } | null
  base_price: number
  base_currency: string
  category: string | null
}

interface ProductFormProps {
  locale: string
  product?: Product
}

const CURRENCIES = ['TWD', 'USD', 'EUR', 'JPY', 'CNY']

export default function ProductForm({ locale, product }: ProductFormProps) {
  const t = useTranslations()
  const router = useRouter()
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    nameZh: product?.name?.zh || '',
    nameEn: product?.name?.en || '',
    descriptionZh: product?.description?.zh || '',
    descriptionEn: product?.description?.en || '',
    basePrice: product?.base_price?.toString() || '',
    baseCurrency: product?.base_currency || 'TWD',
    category: product?.category || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User not authenticated')
      }

      const price = parseFloat(formData.basePrice)
      if (isNaN(price) || price < 0) {
        throw new Error('Invalid price')
      }

      const productData = {
        name: {
          zh: formData.nameZh,
          en: formData.nameEn,
        },
        description: {
          zh: formData.descriptionZh,
          en: formData.descriptionEn,
        },
        base_price: price,
        base_currency: formData.baseCurrency,
        category: formData.category || null,
        user_id: user.id,
      }

      if (product) {
        // Update existing product
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id)

        if (updateError) throw updateError
      } else {
        // Create new product
        const { error: insertError } = await supabase
          .from('products')
          .insert([productData])

        if (insertError) throw insertError
      }

      router.push(`/${locale}/products`)
      router.refresh()
    } catch (err) {
      console.error('Error saving product:', err)
      setError(err instanceof Error ? err.message : 'Failed to save product')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

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
          value={formData.basePrice}
          onChange={(value) => setFormData({ ...formData, basePrice: value })}
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
                {t(`currency.${currency}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <FormInput
        label={t('product.category')}
        name="category"
        value={formData.category}
        onChange={(value) => setFormData({ ...formData, category: value })}
        placeholder={t('product.categoryPlaceholder')}
      />

      <div className="flex justify-end gap-4">
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
