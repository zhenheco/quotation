'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import FormInput from '@/components/ui/FormInput'
import BilingualFormInput from '@/components/ui/BilingualFormInput'
import { useCreateCustomer, useUpdateCustomer, type Customer } from '@/hooks/useCustomers'

interface CustomerFormProps {
  locale: string
  customer?: Customer
}

export default function CustomerForm({ locale, customer }: CustomerFormProps) {
  const t = useTranslations()
  const router = useRouter()

  // 使用 hooks
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer(customer?.id || '')

  // 表單狀態
  const name = customer?.name as { zh: string; en: string } | undefined
  const address = customer?.address as { zh: string; en: string } | null | undefined

  const [formData, setFormData] = useState({
    nameZh: name?.zh || '',
    nameEn: name?.en || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    addressZh: address?.zh || '',
    addressEn: address?.en || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 驗證
    if (!formData.nameZh.trim() || !formData.nameEn.trim()) {
      toast.error(t('customer.validation.nameRequired'))
      return
    }

    if (!formData.email.trim()) {
      toast.error(t('customer.validation.emailRequired'))
      return
    }

    try {
      const customerData = {
        name: {
          zh: formData.nameZh.trim(),
          en: formData.nameEn.trim(),
        },
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        address: {
          zh: formData.addressZh.trim(),
          en: formData.addressEn.trim(),
        },
      }

      if (customer) {
        // 更新現有客戶
        await updateCustomer.mutateAsync(customerData)
        toast.success(t('customer.updateSuccess'))
      } else {
        // 建立新客戶
        await createCustomer.mutateAsync(customerData)
        toast.success(t('customer.createSuccess'))
      }

      router.push(`/${locale}/customers`)
    } catch (err) {
      console.error('Error saving customer:', err)
      const errorMessage = err instanceof Error ? err.message : t('customer.saveError')
      toast.error(errorMessage)
    }
  }

  const isSubmitting = customer ? updateCustomer.isPending : createCustomer.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
