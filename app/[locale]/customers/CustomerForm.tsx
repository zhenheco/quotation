'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import FormInput from '@/components/ui/FormInput'
import BilingualFormInput from '@/components/ui/BilingualFormInput'

interface Customer {
  id: string
  name: { zh: string; en: string }
  email: string
  phone: string | null
  address: { zh: string; en: string } | null
}

interface CustomerFormProps {
  locale: string
  customer?: Customer
}

export default function CustomerForm({ locale, customer }: CustomerFormProps) {
  const t = useTranslations()
  const router = useRouter()
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    nameZh: customer?.name?.zh || '',
    nameEn: customer?.name?.en || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    addressZh: customer?.address?.zh || '',
    addressEn: customer?.address?.en || '',
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

      const customerData = {
        name: {
          zh: formData.nameZh,
          en: formData.nameEn,
        },
        email: formData.email,
        phone: formData.phone || null,
        address: {
          zh: formData.addressZh,
          en: formData.addressEn,
        },
        user_id: user.id,
      }

      if (customer) {
        // Update existing customer
        const { error: updateError } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', customer.id)

        if (updateError) throw updateError
      } else {
        // Create new customer
        const { error: insertError } = await supabase
          .from('customers')
          .insert([customerData])

        if (insertError) throw insertError
      }

      router.push(`/${locale}/customers`)
      router.refresh()
    } catch (err) {
      console.error('Error saving customer:', err)
      setError(err instanceof Error ? err.message : 'Failed to save customer')
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
        label={t('customer.name')}
        name="name"
        valueZh={formData.nameZh}
        valueEn={formData.nameEn}
        onChangeZh={(value) => setFormData({ ...formData, nameZh: value })}
        onChangeEn={(value) => setFormData({ ...formData, nameEn: value })}
        placeholderZh={t('customer.namePlaceholder.zh')}
        placeholderEn={t('customer.namePlaceholder.en')}
        required
      />

      <FormInput
        label={t('customer.email')}
        name="email"
        type="email"
        value={formData.email}
        onChange={(value) => setFormData({ ...formData, email: value })}
        placeholder={t('customer.emailPlaceholder')}
        required
      />

      <FormInput
        label={t('customer.phone')}
        name="phone"
        type="tel"
        value={formData.phone}
        onChange={(value) => setFormData({ ...formData, phone: value })}
        placeholder={t('customer.phonePlaceholder')}
      />

      <BilingualFormInput
        label={t('customer.address')}
        name="address"
        type="textarea"
        valueZh={formData.addressZh}
        valueEn={formData.addressEn}
        onChangeZh={(value) => setFormData({ ...formData, addressZh: value })}
        onChangeEn={(value) => setFormData({ ...formData, addressEn: value })}
        placeholderZh={t('customer.addressPlaceholder.zh')}
        placeholderEn={t('customer.addressPlaceholder.en')}
        rows={3}
      />

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/customers`)}
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
