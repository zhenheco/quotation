'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import FormInput from '@/components/ui/FormInput'
import BilingualFormInput from '@/components/ui/BilingualFormInput'
import { useCreateSupplier, useUpdateSupplier, type Supplier } from '@/hooks/useSuppliers'
import { getSelectedCompanyId } from '@/lib/utils/company-context'

interface SupplierFormProps {
  locale: string
  supplier?: Supplier
}

export default function SupplierForm({ locale, supplier }: SupplierFormProps) {
  const t = useTranslations()
  const router = useRouter()

  // 使用 hooks
  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier(supplier?.id || '')

  // 表單狀態
  const name = supplier?.name as { zh: string; en: string } | undefined
  const address = supplier?.address as { zh: string; en: string } | null | undefined
  const contactPerson = supplier?.contact_person as { name: string; phone: string; email: string } | null | undefined

  const [formData, setFormData] = useState({
    supplierNumber: supplier?.supplier_number || '',
    nameZh: name?.zh || '',
    nameEn: name?.en || '',
    code: supplier?.code || '',
    contactName: contactPerson?.name || '',
    contactPhone: contactPerson?.phone || '',
    contactEmail: contactPerson?.email || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    fax: supplier?.fax || '',
    addressZh: address?.zh || '',
    addressEn: address?.en || '',
    website: supplier?.website || '',
    taxId: supplier?.tax_id || '',
    paymentTerms: supplier?.payment_terms || '',
    paymentDays: supplier?.payment_days?.toString() || '30',
    bankName: supplier?.bank_name || '',
    bankAccount: supplier?.bank_account || '',
    bankCode: supplier?.bank_code || '',
    swiftCode: supplier?.swift_code || '',
    notes: supplier?.notes || '',
  })

  // 新供應商時自動生成編號
  useEffect(() => {
    async function fetchGeneratedNumber() {
      if (!supplier) {
        const companyId = getSelectedCompanyId()
        if (companyId) {
          try {
            const response = await fetch(`/api/suppliers/generate-number?company_id=${companyId}`)
            if (response.ok) {
              const data = await response.json() as { supplier_number?: string }
              if (data.supplier_number) {
                setFormData(prev => ({ ...prev, supplierNumber: data.supplier_number || '' }))
              }
            }
          } catch (error) {
            console.error('Failed to generate supplier number:', error)
          }
        }
      }
    }
    fetchGeneratedNumber()
  }, [supplier])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 驗證必填欄位
    if (!formData.nameZh.trim()) {
      toast.error(t('supplier.validation.nameRequired'))
      return
    }

    try {
      const companyId = getSelectedCompanyId()
      const supplierData = {
        name: {
          zh: formData.nameZh.trim(),
          en: formData.nameEn.trim() || '',
        },
        code: formData.code.trim() || undefined,
        contact_person: formData.contactName.trim() ? {
          name: formData.contactName.trim(),
          phone: formData.contactPhone.trim() || '',
          email: formData.contactEmail.trim() || '',
        } : undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        fax: formData.fax.trim() || undefined,
        address: formData.addressZh.trim() || formData.addressEn.trim() ? {
          zh: formData.addressZh.trim() || '',
          en: formData.addressEn.trim() || '',
        } : undefined,
        website: formData.website.trim() || undefined,
        tax_id: formData.taxId.trim() || undefined,
        payment_terms: formData.paymentTerms.trim() || undefined,
        payment_days: formData.paymentDays ? parseInt(formData.paymentDays, 10) : undefined,
        bank_name: formData.bankName.trim() || undefined,
        bank_account: formData.bankAccount.trim() || undefined,
        bank_code: formData.bankCode.trim() || undefined,
        swift_code: formData.swiftCode.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        supplier_number: formData.supplierNumber.trim() || undefined,
        company_id: companyId || undefined,
      }

      if (supplier) {
        // 更新現有供應商
        await updateSupplier.mutateAsync(supplierData)
        toast.success(t('supplier.updateSuccess'))
      } else {
        // 建立新供應商
        await createSupplier.mutateAsync(supplierData)
        toast.success(t('supplier.createSuccess'))
      }

      router.push(`/${locale}/suppliers`)
    } catch (err) {
      console.error('Error saving supplier:', err)
      const errorMessage = err instanceof Error ? err.message : t('supplier.saveError')
      toast.error(errorMessage)
    }
  }

  const isSubmitting = supplier ? updateSupplier.isPending : createSupplier.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本資訊 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
          {t('supplier.basicInfo')}
        </h3>

        {/* 供應商編號 */}
        <FormInput
          label={t('supplier.supplierNumber')}
          name="supplierNumber"
          type="text"
          value={formData.supplierNumber}
          onChange={(value) => setFormData({ ...formData, supplierNumber: value })}
          placeholder="SUP202512-0001"
        />

        <BilingualFormInput
          label={t('supplier.name')}
          name="name"
          valueZh={formData.nameZh}
          valueEn={formData.nameEn}
          onChangeZh={(value) => setFormData({ ...formData, nameZh: value })}
          onChangeEn={(value) => setFormData({ ...formData, nameEn: value })}
          placeholderZh={t('supplier.namePlaceholder.zh')}
          placeholderEn={t('supplier.namePlaceholder.en')}
          required
        />

        <FormInput
          label={t('supplier.code')}
          name="code"
          type="text"
          value={formData.code}
          onChange={(value) => setFormData({ ...formData, code: value })}
          placeholder={t('supplier.codePlaceholder')}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormInput
            label={t('supplier.email')}
            name="email"
            type="email"
            value={formData.email}
            onChange={(value) => setFormData({ ...formData, email: value })}
            placeholder={t('supplier.emailPlaceholder')}
          />

          <FormInput
            label={t('supplier.phone')}
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={(value) => setFormData({ ...formData, phone: value })}
            placeholder={t('supplier.phonePlaceholder')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormInput
            label={t('supplier.fax')}
            name="fax"
            type="tel"
            value={formData.fax}
            onChange={(value) => setFormData({ ...formData, fax: value })}
            placeholder={t('supplier.faxPlaceholder')}
          />

          <FormInput
            label={t('supplier.taxId')}
            name="taxId"
            type="text"
            value={formData.taxId}
            onChange={(value) => setFormData({ ...formData, taxId: value })}
            placeholder={t('supplier.taxIdPlaceholder')}
          />
        </div>

        <BilingualFormInput
          label={t('supplier.address')}
          name="address"
          type="textarea"
          valueZh={formData.addressZh}
          valueEn={formData.addressEn}
          onChangeZh={(value) => setFormData({ ...formData, addressZh: value })}
          onChangeEn={(value) => setFormData({ ...formData, addressEn: value })}
          placeholderZh={t('supplier.addressPlaceholder.zh')}
          placeholderEn={t('supplier.addressPlaceholder.en')}
          rows={2}
        />

        <FormInput
          label={t('supplier.website')}
          name="website"
          type="url"
          value={formData.website}
          onChange={(value) => setFormData({ ...formData, website: value })}
          placeholder="https://www.example.com"
        />
      </div>

      {/* 聯絡人資訊 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
          {t('supplier.contactPerson')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormInput
            label={t('supplier.contactName')}
            name="contactName"
            type="text"
            value={formData.contactName}
            onChange={(value) => setFormData({ ...formData, contactName: value })}
            placeholder={t('supplier.contactNamePlaceholder')}
          />

          <FormInput
            label={t('supplier.contactPhone')}
            name="contactPhone"
            type="tel"
            value={formData.contactPhone}
            onChange={(value) => setFormData({ ...formData, contactPhone: value })}
            placeholder={t('supplier.contactPhonePlaceholder')}
          />

          <FormInput
            label={t('supplier.contactEmail')}
            name="contactEmail"
            type="email"
            value={formData.contactEmail}
            onChange={(value) => setFormData({ ...formData, contactEmail: value })}
            placeholder={t('supplier.contactEmailPlaceholder')}
          />
        </div>
      </div>

      {/* 付款資訊 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
          {t('supplier.paymentInfo')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormInput
            label={t('supplier.paymentTerms')}
            name="paymentTerms"
            type="text"
            value={formData.paymentTerms}
            onChange={(value) => setFormData({ ...formData, paymentTerms: value })}
            placeholder={t('supplier.paymentTermsPlaceholder')}
          />

          <FormInput
            label={t('supplier.paymentDays')}
            name="paymentDays"
            type="number"
            value={formData.paymentDays}
            onChange={(value) => setFormData({ ...formData, paymentDays: value })}
            placeholder="30"
          />
        </div>
      </div>

      {/* 銀行資訊 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
          {t('supplier.bankInfo')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormInput
            label={t('supplier.bankName')}
            name="bankName"
            type="text"
            value={formData.bankName}
            onChange={(value) => setFormData({ ...formData, bankName: value })}
            placeholder={t('supplier.bankNamePlaceholder')}
          />

          <FormInput
            label={t('supplier.bankAccount')}
            name="bankAccount"
            type="text"
            value={formData.bankAccount}
            onChange={(value) => setFormData({ ...formData, bankAccount: value })}
            placeholder={t('supplier.bankAccountPlaceholder')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormInput
            label={t('supplier.bankCode')}
            name="bankCode"
            type="text"
            value={formData.bankCode}
            onChange={(value) => setFormData({ ...formData, bankCode: value })}
            placeholder={t('supplier.bankCodePlaceholder')}
          />

          <FormInput
            label={t('supplier.swiftCode')}
            name="swiftCode"
            type="text"
            value={formData.swiftCode}
            onChange={(value) => setFormData({ ...formData, swiftCode: value })}
            placeholder={t('supplier.swiftCodePlaceholder')}
          />
        </div>
      </div>

      {/* 備註 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
          {t('supplier.other')}
        </h3>

        <div>
          <label htmlFor="notes" className="block text-sm font-semibold text-gray-900 mb-1">
            {t('supplier.notes')}
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder={t('supplier.notesPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* 按鈕 */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/suppliers`)}
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
