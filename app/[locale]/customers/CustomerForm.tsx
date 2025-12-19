'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import FormInput from '@/components/ui/FormInput'
import BilingualFormInput from '@/components/ui/BilingualFormInput'
import { useCreateCustomer, useUpdateCustomer, type Customer } from '@/hooks/useCustomers'
import OwnerSelect from '@/components/team/OwnerSelect'
import { getSelectedCompanyId } from '@/lib/utils/company-context'
import BusinessCardScanner from './BusinessCardScanner'
import BusinessCardPreview, { type BusinessCardFormData } from './BusinessCardPreview'
import type { BusinessCardData } from '@/lib/services/business-card-ocr'

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
    customerNumber: (customer as { customer_number?: string } | undefined)?.customer_number || '',
    nameZh: name?.zh || '',
    nameEn: name?.en || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    fax: customer?.fax || '',
    tax_id: customer?.tax_id || '',
    addressZh: address?.zh || '',
    addressEn: address?.en || '',
    ownerId: (customer as { owner_id?: string } | undefined)?.owner_id || '',
  })

  // 名片掃描相關狀態
  const [scanData, setScanData] = useState<BusinessCardData | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  /**
   * 處理名片掃描完成
   */
  const handleScanComplete = useCallback((data: BusinessCardData) => {
    setScanData(data)
    setIsPreviewOpen(true)
  }, [])

  /**
   * 確認預覽資料，填入表單
   */
  const handlePreviewConfirm = useCallback((previewData: BusinessCardFormData) => {
    setFormData(prev => ({
      ...prev,
      nameZh: previewData.nameZh || prev.nameZh,
      nameEn: previewData.nameEn || prev.nameEn,
      email: previewData.email || prev.email,
      phone: previewData.phone || prev.phone,
      fax: previewData.fax || prev.fax,
      addressZh: previewData.addressZh || prev.addressZh,
      addressEn: previewData.addressEn || prev.addressEn,
    }))
    setIsPreviewOpen(false)
    setScanData(null)
    toast.success(t('businessCard.filled'))
  }, [t])

  /**
   * 取消預覽
   */
  const handlePreviewCancel = useCallback(() => {
    setIsPreviewOpen(false)
    setScanData(null)
  }, [])

  // 新客戶時自動生成編號
  useEffect(() => {
    async function fetchGeneratedNumber() {
      if (!customer) {
        const companyId = getSelectedCompanyId()
        if (companyId) {
          try {
            const response = await fetch(`/api/customers/generate-number?company_id=${companyId}`)
            if (response.ok) {
              const data = await response.json() as { customer_number?: string }
              if (data.customer_number) {
                setFormData(prev => ({ ...prev, customerNumber: data.customer_number }))
              }
            }
          } catch (error) {
            console.error('Failed to generate customer number:', error)
          }
        }
      }
    }
    fetchGeneratedNumber()
  }, [customer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const companyId = getSelectedCompanyId()
      const customerData = {
        name: {
          zh: formData.nameZh.trim(),
          en: formData.nameEn.trim() || '',
        },
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        fax: formData.fax.trim() || undefined,
        tax_id: formData.tax_id.trim() || undefined,
        address: formData.addressZh.trim() || formData.addressEn.trim() ? {
          zh: formData.addressZh.trim() || '',
          en: formData.addressEn.trim() || '',
        } : undefined,
        owner_id: formData.ownerId || undefined,
        customer_number: formData.customerNumber.trim() || undefined,
        company_id: companyId || undefined,
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
    <>
      {/* 名片掃描預覽對話框 */}
      {scanData && (
        <BusinessCardPreview
          data={scanData}
          isOpen={isPreviewOpen}
          onConfirm={handlePreviewConfirm}
          onCancel={handlePreviewCancel}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 名片掃描按鈕 */}
        <BusinessCardScanner
          onScanComplete={handleScanComplete}
          disabled={isSubmitting}
        />

        {/* 客戶編號 */}
        <FormInput
        label={t('customer.customerNumber')}
        name="customerNumber"
        type="text"
        value={formData.customerNumber}
        onChange={(value) => setFormData({ ...formData, customerNumber: value })}
        placeholder="CUS202512-0001"
      />

      <BilingualFormInput
        label={t('customer.name')}
        name="name"
        valueZh={formData.nameZh}
        valueEn={formData.nameEn}
        onChangeZh={(value) => setFormData({ ...formData, nameZh: value })}
        onChangeEn={(value) => setFormData({ ...formData, nameEn: value })}
        placeholderZh={t('customer.namePlaceholder.zh')}
        placeholderEn={t('customer.namePlaceholder.en')}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormInput
          label={t('customer.email')}
          name="email"
          type="email"
          value={formData.email}
          onChange={(value) => setFormData({ ...formData, email: value })}
          placeholder={t('customer.emailPlaceholder')}
        />

        <FormInput
          label={t('customer.tax_id')}
          name="tax_id"
          type="text"
          value={formData.tax_id}
          onChange={(value) => setFormData({ ...formData, tax_id: value })}
          placeholder={t('customer.tax_idPlaceholder')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormInput
          label={t('customer.phone')}
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={(value) => setFormData({ ...formData, phone: value })}
          placeholder={t('customer.phonePlaceholder')}
        />

        <FormInput
          label={t('customer.fax')}
          name="fax"
          type="tel"
          value={formData.fax}
          onChange={(value) => setFormData({ ...formData, fax: value })}
          placeholder={t('customer.faxPlaceholder')}
        />
      </div>

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

      {/* 負責人選擇 */}
      <div>
        <label htmlFor="ownerId" className="block text-sm font-semibold text-gray-900 mb-1">
          {t('team.ownerLabel')}
        </label>
        <OwnerSelect
          companyId={getSelectedCompanyId() || ''}
          value={formData.ownerId}
          onChange={(ownerId) => setFormData({ ...formData, ownerId })}
        />
        <p className="mt-1 text-xs text-gray-500">{t('team.ownerHint')}</p>
      </div>

      <div className="flex justify-end gap-3">
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
    </>
  )
}
